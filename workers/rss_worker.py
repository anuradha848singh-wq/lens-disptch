import os
import hashlib
import asyncio
import aiohttp
import feedparser
import sqlite3
from datetime import datetime
import time
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_FILE = os.path.join(os.path.dirname(__file__), 'news_scaled.db')
SYSTEM_EMAIL = "system@newshub.com"

# FIX: Reduced from 60 to 5 — prevents hammering news servers and hanging PC
MAX_CONCURRENT_REQUESTS = 5
SEM = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

# Articles older than this are skipped entirely
MAX_ARTICLE_AGE_HOURS = 48

def get_article_id(url, title):
    return hashlib.md5(f"{url}{title}".encode('utf-8')).hexdigest()

def slugify(text):
    import re
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'\s+', '-', text)
    return text[:150]

def get_db_connection():
    """Get database connection — PostgreSQL if DATABASE_URL set, else SQLite."""
    if DATABASE_URL:
        import psycopg2
        return psycopg2.connect(DATABASE_URL), 'postgres'
    else:
        conn = sqlite3.connect(DATABASE_FILE, timeout=30)
        conn.execute("PRAGMA journal_mode=WAL")  # allows concurrent reads
        return conn, 'sqlite'

async def fetch_rss(session, url):
    """Fetch RSS feed with concurrency limit."""
    async with SEM:
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as response:
                if response.status == 200:
                    content = await response.text()
                    return feedparser.parse(content)
                else:
                    print(f"[{datetime.now()}] Failed {url}: HTTP {response.status}")
                    return None
        except Exception as e:
            print(f"[{datetime.now()}] Error fetching {url}: {e}")
            return None

def get_bias_score(bias_str):
    mapping = {
        'far_left': -20,
        'left': -15,
        'center_left': -5,
        'center': 0,
        'center_right': 5,
        'right': 15,
        'far_right': 20
    }
    return mapping.get(bias_str, 0) if bias_str else 0

def parse_entry(entry, pub_id, bias):
    """
    Parse a single RSS entry into article data.
    FIX: NO newspaper3k scraping here — store RSS excerpt only.
    Full content enrichment happens separately only for clustered hot stories.
    """
    title = (entry.get('title') or '').strip()
    url = (entry.get('link') or '').strip()
    if not title or not url:
        return None

    # Skip articles older than MAX_ARTICLE_AGE_HOURS
    pub_date_str = entry.get('published') or entry.get('pubDate') or ''
    if pub_date_str:
        try:
            import email.utils
            pub_date = datetime(*email.utils.parsedate(pub_date_str)[:6])
            age_hours = (datetime.now() - pub_date).total_seconds() / 3600
            if age_hours > MAX_ARTICLE_AGE_HOURS:
                return None
        except:
            pub_date = datetime.now()
    else:
        pub_date = datetime.now()

    article_id = get_article_id(url, title)

    # FIX: Use RSS excerpt only — no scraping
    excerpt = (entry.get('summary') or entry.get('description') or title)[:500]

    # FIX: Safe content extraction — handles empty list case
    content_list = entry.get('content', [])
    content_val = content_list[0].get('value', excerpt) if content_list else excerpt
    body_html = f"<p>{excerpt}</p><p><a href='{url}' target='_blank' rel='noopener'>Read full article →</a></p>"

    # Image from enclosure or media
    image_url = None
    if entry.get('enclosures'):
        for enc in entry.enclosures:
            if enc.get('type', '').startswith('image'):
                image_url = enc.get('href') or enc.get('url')
                break
    if not image_url:
        media = entry.get('media_content', [{}])
        if media:
            image_url = media[0].get('url')

    slug = slugify(title) + "-" + hashlib.md5(url.encode()).hexdigest()[:6]
    now = datetime.now()

    bias_score = get_bias_score(bias)

    return (
        article_id, pub_id,
        title, slug, excerpt, body_html, image_url, url,
        'published', bias_score,
        None,  # cluster_id — assigned by clustering worker
        0,     # importance_score
        now,   # fetched_at
        pub_date, now, now
    )

async def process_source(session, job):
    """Fetch one RSS source and return parsed articles. No DB writes here."""
    job_id, pub_id, rss_url, bias, pub_name = job
    print(f"[{datetime.now()}] Processing: {pub_name} ({rss_url})")

    if not rss_url:
        return job_id, pub_id, pub_name, [], 'failed', 'No RSS URL'

    feed = await fetch_rss(session, rss_url)
    if not feed or not hasattr(feed, 'entries') or not feed.entries:
        return job_id, pub_id, pub_name, [], 'failed', 'Empty or invalid feed'

    # FIX: Process entries synchronously (no gather) — avoids burst load
    # Each entry is just string parsing, no network calls
    articles = []
    for entry in feed.entries[:25]:
        parsed = parse_entry(entry, pub_id, bias)
        if parsed:
            articles.append(parsed)

    print(f"[{datetime.now()}] {pub_name}: Parsed {len(articles)} articles")
    return job_id, pub_id, pub_name, articles, 'completed', None

async def run_worker():
    print(f"[{datetime.now()}] High-Performance RSS Worker starting...")
    if not DATABASE_URL:
        print("DATABASE_URL not set. Running in SQLite mode (news_scaled.db).")

    while True:
        try:
            conn, db_type = get_db_connection()
            cur = conn.cursor()

            # Get system user
            if db_type == 'postgres':
                cur.execute("SELECT id FROM users WHERE email = %s", (SYSTEM_EMAIL,))
            else:
                cur.execute("SELECT id FROM users WHERE email = ?", (SYSTEM_EMAIL,))
            res = cur.fetchone()
            system_user_id = res[0] if res else 'system-user-id'

            # FIX: Get pending jobs
            cur.execute("""
                SELECT f.id, f.publisher_id, p.rss_url, p.bias_rating, p.name
                FROM fetch_queue f
                JOIN publishers p ON f.publisher_id = p.id
                WHERE f.status = 'pending'
                ORDER BY f.created_at ASC
                LIMIT 50
            """)
            jobs = cur.fetchall()

            if not jobs:
                print("No pending jobs. Sleeping 60s...")
                conn.close()

                # FIX: Auto-reset queue after all jobs complete
                from seed_sqlite import reset_queue 
                print("Resetting queue for next fetch cycle...")
                reset_queue()
                await asyncio.sleep(60) # 1 minute for local development
                continue

            # Mark all as processing
            job_ids = [j[0] for j in jobs]
            if db_type == 'postgres':
                cur.execute("UPDATE fetch_queue SET status = 'processing' WHERE id = ANY(%s)", (job_ids,))
            else:
                placeholders = ','.join(['?'] * len(job_ids))
                cur.execute(f"UPDATE fetch_queue SET status = 'processing' WHERE id IN ({placeholders})", job_ids)
            conn.commit()
            conn.close()

            # Fetch all RSS feeds concurrently (max 5 at a time via semaphore)
            all_articles = []
            job_results = []

            async with aiohttp.ClientSession(headers={
                "User-Agent": "Mozilla/5.0 (compatible; NewsPlatform/2.0; RSS Reader)"
            }) as session:
                # FIX: Process in small batches of 5 to avoid burst
                batch_size = 5
                for i in range(0, len(jobs), batch_size):
                    batch = jobs[i:i + batch_size]
                    tasks = [process_source(session, job) for job in batch]
                    batch_results = await asyncio.gather(*tasks)
                    for result in batch_results:
                        job_id, pub_id, pub_name, articles, status, error = result
                        job_results.append((job_id, pub_id, status, error))
                        all_articles.extend(articles)
                    # Small delay between batches — prevents request burst
                    if i + batch_size < len(jobs):
                        await asyncio.sleep(1)

            # FIX: ONE batch insert for all articles instead of N connections
            if all_articles:
                conn, db_type = get_db_connection()
                cur = conn.cursor()
                try:
                    if db_type == 'postgres':
                        from psycopg2.extras import execute_values
                        execute_values(cur, """
                            INSERT INTO articles (
                                id, source_id, title, slug, excerpt,
                                body_html, hero_image_url, url, status, bias_score,
                                cluster_id, importance_score, fetched_at,
                                published_at, created_at, updated_at
                            ) VALUES %s ON CONFLICT (id) DO NOTHING
                        """, all_articles)
                    else:
                        cur.executemany("""
                            INSERT OR IGNORE INTO articles (
                                id, source_id, title, slug, excerpt,
                                body_html, hero_image_url, url, status, bias_score,
                                cluster_id, importance_score, fetched_at,
                                published_at, created_at, updated_at
                            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """, all_articles)
                    conn.commit()
                    print(f"[{datetime.now()}] Inserted {len(all_articles)} articles total.")
                except Exception as e:
                    print(f"[{datetime.now()}] DB insert error: {e}")
                    conn.rollback()
                finally:
                    conn.close()

            # Update job statuses
            conn, db_type = get_db_connection()
            cur = conn.cursor()
            for job_id, pub_id, status, error in job_results:
                if db_type == 'postgres':
                    cur.execute("UPDATE fetch_queue SET status = %s, error = %s WHERE id = %s", (status, error, job_id))
                    if status == 'completed':
                        cur.execute("UPDATE publishers SET last_fetched_at = %s, fail_count = 0 WHERE id = %s", (datetime.now(), pub_id))
                    else:
                        cur.execute("UPDATE publishers SET fail_count = fail_count + 1 WHERE id = %s", (pub_id,))
                else:
                    cur.execute("UPDATE fetch_queue SET status = ?, error = ? WHERE id = ?", (status, error, job_id))
                    if status == 'completed':
                        cur.execute("UPDATE publishers SET last_fetched_at = ?, fail_count = 0 WHERE id = ?", (datetime.now(), pub_id))
            conn.commit()
            conn.close()

            print(f"[{datetime.now()}] Batch complete. {len(job_results)} sources processed, {len(all_articles)} articles saved.")

        except Exception as e:
            print(f"[{datetime.now()}] Worker Loop Error: {e}")
            import traceback
            traceback.print_exc()
            await asyncio.sleep(10)

if __name__ == "__main__":
    asyncio.run(run_worker())
