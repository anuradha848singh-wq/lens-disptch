import psycopg2, os, time
from sentence_transformers import SentenceTransformer
import numpy as np
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is not set")
    return psycopg2.connect(database_url)

def run_backfill():
    logger.info("Starting backfill process...")
    model = SentenceTransformer("intfloat/e5-small-v2")
    db = get_db()
    cur = db.cursor()

    # Fetch all unembedded articles in batches
    BATCH_SIZE = 256

    cur.execute("SELECT COUNT(*) FROM articles WHERE is_embedded = FALSE")
    total = cur.fetchone()[0]
    
    if total == 0:
        logger.info("No articles to backfill.")
        return

    logger.info(f"Backfilling {total} articles...")

    processed = 0
    while True:
        cur.execute("""
            SELECT id, title, excerpt FROM articles 
            WHERE is_embedded = FALSE 
            ORDER BY published_at DESC
            LIMIT %s
        """, [BATCH_SIZE])
        
        batch = cur.fetchall()
        if not batch: break
        
        ids = [row[0] for row in batch]
        texts = [f"passage: {row[1]}. {(row[2] or '')[:300]}" for row in batch]
        
        # Batch encode — much faster than one by one
        embeddings = model.encode(texts, normalize_embeddings=True, batch_size=64)
        
        # Batch insert
        values = [(ids[i], embeddings[i].tolist()) for i in range(len(batch))]
        cur.executemany("""
            INSERT INTO article_embeddings (article_id, embedding)
            VALUES (%s, %s)
            ON CONFLICT (article_id) DO UPDATE SET embedding = EXCLUDED.embedding
        """, values)
        
        # Mark as embedded
        cur.execute("UPDATE articles SET is_embedded = TRUE WHERE id = ANY(%s)", [ids])
        db.commit()
        
        processed += len(batch)
        logger.info(f"Progress: {processed}/{total} ({round(processed/total*100)}%)")
        time.sleep(0.1)  # don't hammer the DB

    logger.info("Backfill complete.")
    cur.close()
    db.close()

if __name__ == "__main__":
    run_backfill()
