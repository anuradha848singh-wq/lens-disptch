import sqlite3
import hashlib
from datetime import datetime
import os

DATABASE_FILE = os.path.join(os.path.dirname(__file__), 'news_scaled.db')

def get_article_id(url, title):
    return hashlib.md5(f"{url}{title}".encode('utf-8')).hexdigest()

def seed():
    conn = sqlite3.connect(DATABASE_FILE)
    cur = conn.cursor()
    
    # Create tables (Base schema)
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            password_hash TEXT,
            role TEXT DEFAULT 'editor',
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS publishers (
            id TEXT PRIMARY KEY,
            name TEXT,
            rss_url TEXT,
            bias_rating TEXT,
            active BOOLEAN DEFAULT 1,
            last_fetched_at TIMESTAMP,
            fail_count INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS articles (
            id TEXT PRIMARY KEY,
            source_id TEXT,
            title TEXT,
            slug TEXT,
            excerpt TEXT,
            body_html TEXT,
            hero_image_url TEXT,
            url TEXT,
            status TEXT DEFAULT 'published',
            bias_score INTEGER DEFAULT 0,
            published_at TIMESTAMP,
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS fetch_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            publisher_id TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            error TEXT,
            FOREIGN KEY (publisher_id) REFERENCES publishers(id)
        );
    """)
    
    # Add system user
    system_email = "system@newshub.com"
    cur.execute("INSERT OR IGNORE INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)",
                ("system-user-id", system_email, datetime.now(), datetime.now()))
    
    # Add some sample publishers if none exist
    cur.execute("SELECT COUNT(*) FROM publishers")
    if cur.fetchone()[0] == 0:
        sample_publishers = [
            ("techcrunch", "TechCrunch", "https://techcrunch.com/feed/", "center"),
            ("theverge", "The Verge", "https://www.theverge.com/rss/index.xml", "center"),
            ("propublica", "ProPublica", "https://www.propublica.org/feeds/propublica/main", "center")
        ]
        for p_id, name, rss, bias in sample_publishers:
            cur.execute("INSERT OR IGNORE INTO publishers (id, name, rss_url, bias_rating) VALUES (?, ?, ?, ?)",
                        (p_id, name, rss, bias))
            # Add to fetch queue
            cur.execute("INSERT OR IGNORE INTO fetch_queue (publisher_id, status) VALUES (?, ?)", (p_id, 'pending'))
    
    # Migrate existing database — add missing columns if they don't exist
    existing_cols = [row[1] for row in cur.execute("PRAGMA table_info(articles)").fetchall()]
    if 'cluster_id' not in existing_cols:
        cur.execute("ALTER TABLE articles ADD COLUMN cluster_id TEXT")
        print("Added cluster_id column.")
    if 'importance_score' not in existing_cols:
        cur.execute("ALTER TABLE articles ADD COLUMN importance_score INTEGER DEFAULT 0")
        print("Added importance_score column.")
    if 'fetched_at' not in existing_cols:
        cur.execute("ALTER TABLE articles ADD COLUMN fetched_at TIMESTAMP")
        print("Added fetched_at column.")

    # Create indices AFTER migration to ensure columns exist
    cur.executescript("""
        CREATE INDEX IF NOT EXISTS idx_articles_cluster ON articles(cluster_id);
        CREATE INDEX IF NOT EXISTS idx_articles_fetched ON articles(fetched_at);
        CREATE INDEX IF NOT EXISTS idx_articles_publisher ON articles(publisher_id);
    """)
        
    conn.commit()
    conn.close()
    print("SQLite seeded and migrated successfully.")

def reset_queue():
    """Re-queue all active publishers for next fetch cycle."""
    conn = sqlite3.connect(DATABASE_FILE)
    cur = conn.cursor()
    # Delete completed/failed jobs and re-add all active publishers as pending
    cur.execute("DELETE FROM fetch_queue WHERE status IN ('completed', 'failed')")
    cur.execute("SELECT id FROM publishers WHERE active = 1")
    publishers = cur.fetchall()
    for (pub_id,) in publishers:
        cur.execute("INSERT INTO fetch_queue (publisher_id, status) VALUES (?, 'pending')", (pub_id,))
    conn.commit()
    conn.close()
    print(f"Queue reset: {len(publishers)} publishers re-queued.")

if __name__ == "__main__":
    seed()
