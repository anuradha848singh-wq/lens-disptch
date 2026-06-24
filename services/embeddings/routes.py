# services/embeddings/routes.py

from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np
import faiss
from helpers import enforce_bias_diversity

router = APIRouter()


# ── Request models ─────────────────────────────────────────────────────────
class EmbedRequest(BaseModel):
    article_id: str
    title: str
    excerpt: str

class SearchRequest(BaseModel):
    query: str
    top_k: int = 10
    bias_filter: str | None = None   # "left" | "center" | "right" | None

class SimilarRequest(BaseModel):
    article_id: str
    top_k: int = 20
    max_hours_apart: int = 48


# ── ROUTE 1: Embed a new article ──────────────────────────────────────────
@router.post("/embed")
def embed_article(req: EmbedRequest):
    import main as m                 # lazy import to avoid circular ref

    text = f"passage: {req.title}. {req.excerpt[:300]}"
    embedding = m.model.encode(text, normalize_embeddings=True)

    db = m.get_db()
    cur = db.cursor()
    cur.execute("""
        INSERT INTO article_embeddings (article_id, embedding)
        VALUES (%s, %s)
        ON CONFLICT (article_id) DO UPDATE SET embedding = EXCLUDED.embedding
    """, [req.article_id, embedding.tolist()])
    cur.execute("UPDATE articles SET is_embedded = TRUE WHERE id = %s", [req.article_id])
    db.commit()

    vec = np.array([embedding], dtype="float32")
    m.index.add(vec)
    m.index_id_map.append(req.article_id)

    cur.close()
    db.close()
    return {"article_id": req.article_id, "dim": len(embedding)}


# ── ROUTE 2: Find similar articles ────────────────────────────────────────
@router.post("/similar")
def find_similar(req: SimilarRequest):
    import main as m

    db = m.get_db()
    cur = db.cursor()

    cur.execute(
        "SELECT embedding FROM article_embeddings WHERE article_id = %s",
        [req.article_id],
    )
    row = cur.fetchone()
    if not row:
        cur.close(); db.close()
        return {"similar": []}

    query_vec = np.array([row[0]], dtype="float32")
    faiss.normalize_L2(query_vec)

    k = min(req.top_k * 3, m.index.ntotal)
    if k == 0:
        cur.close(); db.close()
        return {"similar": []}

    scores, indices = m.index.search(query_vec, k=k)

    candidate_ids = [m.index_id_map[i] for i in indices[0] if 0 <= i < len(m.index_id_map)]
    candidate_scores = {
        m.index_id_map[i]: float(scores[0][j])
        for j, i in enumerate(indices[0])
        if 0 <= i < len(m.index_id_map)
    }

    if not candidate_ids:
        cur.close(); db.close()
        return {"similar": []}

    cur.execute("""
        SELECT a.id, a.title, a.excerpt, a.published_at,
               p.bias_rating, p.name AS publisher_name, p.website
        FROM articles a
        JOIN publishers p ON a.source_id = p.id
        WHERE a.id = ANY(%s)
          AND a.id != %s
          AND a.published_at > NOW() - make_interval(hours := %s)
        ORDER BY a.published_at DESC
    """, [candidate_ids, req.article_id, req.max_hours_apart])

    results = []
    for r in cur.fetchall():
        score = candidate_scores.get(r[0], 0)
        if score > 0.72:
            results.append({
                "id": r[0],
                "title": r[1],
                "score": round(score, 4),
                "bias": r[4],
                "publisher": r[5],
                "published_at": str(r[3]),
            })

    results.sort(key=lambda x: x["score"], reverse=True)

    cur.close()
    db.close()
    return {"similar": enforce_bias_diversity(results, req.top_k)}


# ── ROUTE 3: Semantic search ──────────────────────────────────────────────
@router.post("/search")
def search(req: SearchRequest):
    import main as m

    query_vec = m.model.encode(f"query: {req.query}", normalize_embeddings=True)
    query_vec = np.array([query_vec], dtype="float32")
    faiss.normalize_L2(query_vec)

    k = min(req.top_k * 2, m.index.ntotal)
    if k == 0:
        return {"results": [], "query": req.query}

    scores, indices = m.index.search(query_vec, k=k)
    candidate_ids = [m.index_id_map[i] for i in indices[0] if 0 <= i < len(m.index_id_map)]

    if not candidate_ids:
        return {"results": [], "query": req.query}

    db = m.get_db()
    cur = db.cursor()

    bias_clause = "AND p.bias_rating::text ILIKE %s" if req.bias_filter else ""
    bias_param = [f"%{req.bias_filter}%"] if req.bias_filter else []

    cur.execute(f"""
        SELECT a.id, a.title, a.excerpt, a.published_at,
               p.bias_rating, p.name AS publisher_name
        FROM articles a
        JOIN publishers p ON a.source_id = p.id
        WHERE a.id = ANY(%s)
          {bias_clause}
          AND a.published_at > NOW() - INTERVAL '7 days'
        ORDER BY a.published_at DESC
        LIMIT %s
    """, [candidate_ids] + bias_param + [req.top_k])

    results = [
        {"id": r[0], "title": r[1], "excerpt": r[2], "bias": r[4], "publisher": r[5]}
        for r in cur.fetchall()
    ]

    cur.close()
    db.close()
    return {"results": results, "query": req.query}


# ── ROUTE 4: Detect duplicates ────────────────────────────────────────────
@router.post("/is-duplicate")
def is_duplicate(req: EmbedRequest):
    import main as m

    text = f"passage: {req.title}. {req.excerpt[:300]}"
    embedding = m.model.encode(text, normalize_embeddings=True)
    query_vec = np.array([embedding], dtype="float32")
    faiss.normalize_L2(query_vec)

    k = min(5, m.index.ntotal)
    if k == 0:
        return {"is_duplicate": False}

    scores, indices = m.index.search(query_vec, k=k)

    for score, idx in zip(scores[0], indices[0]):
        if score > 0.91 and 0 <= idx < len(m.index_id_map):
            match_id = m.index_id_map[idx]
            db = m.get_db()
            cur = db.cursor()
            cur.execute("SELECT domain FROM articles WHERE id = %s", [match_id])
            row = cur.fetchone()
            domain = row[0] if row else "unknown"
            cur.close()
            db.close()

            return {
                "is_duplicate": True,
                "duplicate_of": match_id,
                "duplicate_of_domain": domain,
                "similarity": float(score),
            }
    return {"is_duplicate": False}


# ── ROUTE 5: Cluster new articles ─────────────────────────────────────────
@router.post("/cluster-new")
def cluster_new_articles():
    import main as m

    db = m.get_db()
    cur = db.cursor()

    cur.execute("""
        SELECT a.id, a.title, a.excerpt, ae.embedding
        FROM articles a
        JOIN article_embeddings ae ON a.id = ae.article_id
        WHERE a.cluster_id IS NULL
          AND a.published_at > NOW() - INTERVAL '2 hours'
        ORDER BY a.published_at ASC
    """)

    unclustered = cur.fetchall()
    assignments: dict[str, str] = {}

    for article_id, title, excerpt, embedding in unclustered:
        vec = np.array([embedding], dtype="float32")
        faiss.normalize_L2(vec)

        k = min(10, m.index.ntotal)
        if k == 0:
            continue

        scores, indices = m.index.search(vec, k=k)

        best_cluster = None
        best_score = 0.72

        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(m.index_id_map):
                continue
            candidate_id = m.index_id_map[idx]
            if candidate_id == article_id:
                continue

            cur.execute("SELECT cluster_id FROM articles WHERE id = %s", [candidate_id])
            result = cur.fetchone()
            if result and result[0] and score > best_score:
                best_cluster = result[0]
                best_score = float(score)

        if best_cluster:
            cur.execute(
                "UPDATE articles SET cluster_id = %s WHERE id = %s",
                [best_cluster, article_id],
            )
        else:
            # Use the article title as initial cluster headline
            cur.execute(
                """INSERT INTO clusters (headline, first_seen_at)
                   VALUES (%s, NOW()) RETURNING id""",
                [title],
            )
            new_cluster_id = cur.fetchone()[0]
            cur.execute(
                "UPDATE articles SET cluster_id = %s WHERE id = %s",
                [new_cluster_id, article_id],
            )
            best_cluster = new_cluster_id

        assignments[article_id] = best_cluster

    db.commit()
    cur.close()
    db.close()
    return {"clustered": len(assignments), "assignments": assignments}


# ── ROUTE 6: Rebuild FAISS index on demand ─────────────────────────────────
@router.post("/rebuild-index")
def trigger_rebuild_index():
    import main as m
    m.rebuild_faiss_index()
    return {"status": "ok", "size": m.index.ntotal}


# ── Health check ───────────────────────────────────────────────────────────
@router.get("/health")
def health():
    import main as m
    return {
        "status": "ok",
        "model": "e5-small-v2",
        "index_size": m.index.ntotal,
    }
