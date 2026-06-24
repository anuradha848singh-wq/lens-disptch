import os
import numpy as np
from datetime import datetime, timedelta
import time
from dotenv import load_dotenv
import uuid
from sentence_transformers import SentenceTransformer
import spacy

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# ── CRITICAL: Use E5-small-v2 — same model as the embedding service ──────────
# Previous code used 'all-MiniLM-L6-v2' which produces INCOMPATIBLE embeddings
# that cannot be compared with the FAISS index built by the embedding service.
# Both must use the same model for cosine similarity to be meaningful.
SIMILARITY_THRESHOLD = 0.72

print("Loading NLP models...")
model = SentenceTransformer('intfloat/e5-small-v2')
nlp = spacy.load('en_core_web_sm')
print("Models loaded: E5-small-v2 + spaCy en_core_web_sm")


def get_db_connection():
    if DATABASE_URL:
        import psycopg2
        return psycopg2.connect(DATABASE_URL), 'postgres'
    else:
        import sqlite3
        DATABASE_FILE = os.path.join(os.path.dirname(__file__), 'news_scaled.db')
        conn = sqlite3.connect(DATABASE_FILE, timeout=30)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.row_factory = sqlite3.Row
        return conn, 'sqlite'


def param(db_type):
    return '%s' if db_type == 'postgres' else '?'


def extract_named_entities(text):
    doc = nlp(text)
    entities = {ent.text.lower() for ent in doc.ents if ent.label_ in ['PERSON', 'ORG', 'GPE', 'EVENT']}
    return entities


def run_clustering():
    print(f"[{datetime.now()}] Deep-Dive Clustering Engine (E5-small-v2) starting...")

    while True:
        try:
            conn, db_type = get_db_connection()
            cur = conn.cursor()
            p = param(db_type)

            # 30-day window for developing stories to accommodate local demo data
            since = datetime.now() - timedelta(days=30)

            cur.execute(f"""
                SELECT id, title, excerpt, cluster_id, source_id, published_at
                FROM articles
                WHERE published_at > {p}
                  AND status = 'published'
                ORDER BY published_at DESC
            """, (since,))

            rows = cur.fetchall()
            if not rows or len(rows) < 2:
                print(f"[{datetime.now()}] Not enough articles ({len(rows) if rows else 0}) to cluster.")
                conn.close()
                time.sleep(60)
                continue

            ids = [r[0] for r in rows]
            # E5 requires "passage:" prefix for document encoding
            texts = [f"passage: {r[1]}. {(r[2] or '')[:300]}" for r in rows]
            source_ids = [r[4] for r in rows]
            pub_dates = []
            for r in rows:
                try:
                    pd = r[5]
                    if isinstance(pd, datetime):
                        pub_dates.append(pd)
                    elif pd:
                        pub_dates.append(datetime.fromisoformat(str(pd).replace('Z', '+00:00')))
                    else:
                        pub_dates.append(datetime.now())
                except:
                    pub_dates.append(datetime.now())

            existing_clusters = {r[0]: r[3] for r in rows if r[3]}

            # Protect strong clusters (multi-publisher)
            if db_type == 'postgres':
                cur.execute("""
                    SELECT cluster_id, COUNT(DISTINCT source_id) as pub_count
                    FROM articles
                    WHERE cluster_id IS NOT NULL
                    GROUP BY cluster_id
                    HAVING COUNT(DISTINCT source_id) >= 2
                """)
            else:
                cur.execute("""
                    SELECT cluster_id, COUNT(DISTINCT source_id) as pub_count
                    FROM articles
                    WHERE cluster_id IS NOT NULL
                    GROUP BY cluster_id
                    HAVING pub_count >= 2
                """)
            strong_clusters = set(row[0] for row in cur.fetchall())
            skip_ids = set(aid for aid, cid in existing_clusters.items() if cid in strong_clusters)

            cluster_ids_to_process = [i for i, aid in enumerate(ids) if aid not in skip_ids]
            if len(cluster_ids_to_process) < 2:
                print(f"[{datetime.now()}] No new articles need clustering.")
                conn.close()
                time.sleep(60)
                continue

            print(f"[{datetime.now()}] Encoding {len(texts)} articles with E5-small-v2...")
            
            # ── Batch encode ALL articles (E5 with normalize) ──────────────
            embeddings = model.encode(texts, normalize_embeddings=True, batch_size=64)

            assigned_clusters = {}
            visited = set()
            process_embeddings = embeddings[cluster_ids_to_process]

            for local_i, global_i in enumerate(cluster_ids_to_process):
                if global_i in visited:
                    continue

                article_id = ids[global_i]
                current_cluster_id = existing_clusters.get(article_id)
                if not current_cluster_id or current_cluster_id not in strong_clusters:
                    current_cluster_id = str(uuid.uuid4())

                visited.add(global_i)
                group_ids = [article_id]
                group_source_ids = {source_ids[global_i]}

                vec_a = process_embeddings[local_i]

                for global_j in range(len(ids)):
                    if global_j in visited:
                        continue
                    
                    # Cosine similarity (normalized vectors → dot product)
                    vec_b = embeddings[global_j]
                    sim_score = float(np.dot(vec_a, vec_b))

                    target_id = ids[global_j]
                    
                    # Using 0.84 as a strong E5 semantic threshold
                    if sim_score > 0.84 and target_id not in skip_ids:
                        
                        # TIME DECAY: within 7 days
                        try:
                            days_apart = abs((pub_dates[global_i] - pub_dates[global_j]).total_seconds() / 86400)
                        except:
                            days_apart = 0

                        if days_apart <= 7:
                            group_ids.append(target_id)
                            group_source_ids.add(source_ids[global_j])
                            visited.add(global_j)

                for member_id in group_ids:
                    assigned_clusters[member_id] = (current_cluster_id, group_source_ids)

            # ── Importance score based on publisher diversity ───────────────
            def calc_importance(pub_count):
                if pub_count <= 1: return 5
                scores = {2: 20, 3: 40, 4: 60, 5: 80}
                return min(100, scores.get(pub_count, 80 + (pub_count - 5) * 4))

            # ── Batch update articles + upsert clusters ────────────────────
            cluster_groups = {}  # cluster_id -> {source_ids, article_ids, importance, headline}
            
            for i, article_id in enumerate(ids):
                c_data = assigned_clusters.get(article_id)
                if not c_data:
                    continue
                    
                cid, pubs = c_data
                imp = calc_importance(len(pubs))
                
                if cid not in cluster_groups:
                    # Use the first article's title as cluster headline
                    idx = ids.index(article_id)
                    headline = rows[idx][1] if idx < len(rows) else "News Cluster"
                    cluster_groups[cid] = {
                        "source_ids": set(pubs),
                        "article_ids": [article_id],
                        "importance": imp,
                        "headline": headline,
                    }
                else:
                    cluster_groups[cid]["source_ids"].update(pubs)
                    cluster_groups[cid]["article_ids"].append(article_id)
                    cluster_groups[cid]["importance"] = max(cluster_groups[cid]["importance"], imp)

            if db_type == 'postgres':
                # ── Upsert clusters table ──────────────────────────────────
                for cid, cdata in cluster_groups.items():
                    src_count = len(cdata["source_ids"])
                    try:
                        cur.execute("""
                            INSERT INTO clusters (id, headline, source_count, importance_score, first_seen_at, last_updated_at)
                            VALUES (%s, %s, %s, %s, NOW(), NOW())
                            ON CONFLICT (id) DO UPDATE SET
                                source_count = GREATEST(clusters.source_count, EXCLUDED.source_count),
                                importance_score = GREATEST(clusters.importance_score, EXCLUDED.importance_score),
                                last_updated_at = NOW()
                        """, (cid, cdata["headline"][:500], src_count, cdata["importance"]))
                    except Exception as ce:
                        print(f"  Cluster upsert error for {cid[:8]}: {ce}")
                        conn.rollback()

                # ── Batch update articles ──────────────────────────────────
                for cid, cdata in cluster_groups.items():
                    for aid in cdata["article_ids"]:
                        cur.execute(
                            "UPDATE articles SET cluster_id = %s, importance_score = %s WHERE id = %s",
                            (cid, cdata["importance"], aid)
                        )

                # ── Store embeddings in article_embeddings table ───────────
                for i, article_id in enumerate(ids):
                    vec_str = f"[{','.join(str(float(x)) for x in embeddings[i])}]"
                    try:
                        cur.execute("""
                            INSERT INTO article_embeddings (article_id, embedding)
                            VALUES (%s, %s::vector)
                            ON CONFLICT (article_id) DO UPDATE SET embedding = EXCLUDED.embedding
                        """, (article_id, vec_str))
                    except:
                        pass  # table may not exist yet

            else:
                # SQLite fallback
                updates = [(cid, cdata["importance"], aid)
                           for cid, cdata in cluster_groups.items()
                           for aid in cdata["article_ids"]]
                for batch_start in range(0, len(updates), 500):
                    batch = updates[batch_start:batch_start + 500]
                    cur.executemany(
                        "UPDATE articles SET cluster_id = ?, importance_score = ? WHERE id = ?",
                        batch
                    )

            conn.commit()
            conn.close()

            unique_clusters = len(cluster_groups)
            total_assigned = sum(len(v["article_ids"]) for v in cluster_groups.values())
            print(f"[{datetime.now()}] Clustered {total_assigned} articles into {unique_clusters} clusters.")

        except Exception as e:
            print(f"[{datetime.now()}] Clustering Error: {e}")
            import traceback
            traceback.print_exc()

        time.sleep(60)


if __name__ == "__main__":
    run_clustering()
