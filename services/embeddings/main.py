# services/embeddings/main.py

from fastapi import FastAPI
from sentence_transformers import SentenceTransformer
import numpy as np
import faiss
import psycopg2
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Lens Dispatch Embeddings Service")

# ── Load model ONCE at startup — stays in memory ──────────────────────────
logger.info("Loading E5-small-v2...")
model = SentenceTransformer("intfloat/e5-small-v2")
logger.info("Model ready.")

# ── FAISS index — lives in memory, rebuilt from DB on startup ──────────────
DIM = 384
index = faiss.IndexFlatIP(DIM)      # Inner product (= cosine after normalize)
index_id_map: list[str] = []        # Maps FAISS position → article ID

# ── DB connection ──────────────────────────────────────────────────────────
def get_db():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is not set")
    return psycopg2.connect(database_url)


def rebuild_faiss_index():
    """Rebuild the full FAISS index from the article_embeddings table."""
    global index, index_id_map
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("""
            SELECT article_id, embedding 
            FROM article_embeddings 
            ORDER BY embedded_at ASC
        """)
        rows = cur.fetchall()

        new_index = faiss.IndexFlatIP(DIM)
        new_map: list[str] = []

        if rows:
            embeddings = []
            for article_id, emb in rows:
                embeddings.append(emb)
                new_map.append(article_id)

            vecs = np.array(embeddings, dtype="float32")
            faiss.normalize_L2(vecs)
            new_index.add(vecs)

        index = new_index
        index_id_map = new_map
        logger.info(f"FAISS index rebuilt with {len(index_id_map)} articles.")
        cur.close()
        db.close()
    except Exception as e:
        logger.error(f"Failed to rebuild FAISS index: {e}")


@app.on_event("startup")
def startup_event():
    logger.info("Rebuilding FAISS index from database...")
    rebuild_faiss_index()


# ── Import and register routes AFTER app + shared state are defined ────────
from routes import router          # noqa: E402
app.include_router(router)
