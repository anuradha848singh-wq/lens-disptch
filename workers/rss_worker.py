import os
import hashlib
import asyncio
import aiohttp
import feedparser
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
import time
from dotenv import load_dotenv
from newspaper import Article as NewsArticle
from concurrent.futures import ThreadPoolExecutor
import tldextract

import sqlite3
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SYSTEM_EMAIL = "system@newshub.com"
MAX_CONCURRENT_REQUESTS = 60
SEM = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
EXECUTOR = ThreadPoolExecutor(max_workers=20)

def get_article_id(url, title):
    """Generate MD5 hash for deduplication based on URL and Title."""
    return hashlib.md5(f"{url}{title}".encode('utf-8')).hexdigest()

def slugify(text):
    import re
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'\s+', '-', text)
    return text[:150]

def extract_full_text(url):
    """Synchronous full text extraction using newspaper3k."""
    try:
        article = NewsArticle(url)
        article.download()
        article.parse()
        return article.text, article.top_image
    except Exception as e:
        # print(f"Newspaper3k error for {url}: {e}")
        return None, None

async def get_full_text_async(url):
    """Run full text extraction in a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(EXECUTOR, extract_full_text, url)

async def fetch_rss(session, url):
    async with SEM:
        try:
            async with session.get(url, timeout=15) as response:
                if response.status == 200:
                    content = await response.text()
                    return feedparser.parse(content)
        except Exception as e:
            print(f"Error fetching RSS {url}: {e}")
    return None

def get_db_connection():
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    else:
        # Local SQLite fallback for demo/scaling test if no Postgres URL is provided
        conn = sqlite3.connect('news_scaled.db')
        # Simple schema creation for SQLite if it doesn't exist
        cur = conn.cursor()
        cur.executescript("""
            CREATE TABLE IF NOT EXISTS publishers (
                id TEXT PRIMARY KEY,
                name TEXT,
                rss_url TEXT,
                bias_rating TEXT,
                active BOOLEAN DEFAULT 1,
                last_fetched_at TIMESTAMP,
                fail_count INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS fetch_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                publisher_id TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                error TEXT,
                FOREIGN KEY (publisher_id) REFERENCES publishers(id)
            );
            CREATE TABLE IF NOT EXISTS articles (
                id TEXT PRIMARY KEY,
                publisher_id TEXT,
                author_id TEXT,
                title TEXT,
                slug TEXT,
                excerpt TEXT,
                body_html TEXT,
                image_url TEXT,
                source_url TEXT,
                status TEXT,
                news_bias TEXT,
                view_count INTEGER DEFAULT 0,
                published_at TIMESTAMP,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            );
        """)
        conn.commit()
        return conn

async def process_entry(session, entry, pub_id, system_user_id, bias):
    title = entry.get('title', '')
    url = entry.get('link', '')
    if not title or not url: return None
    
    article_id = get_article_id(url, title)
    excerpt = entry.get('summary', entry.get('description', title))[:500]
    
    # Attempt full text extraction
    full_text, top_image = await get_full_text_async(url)
    
    if full_text:
        body_html = f"<p>{excerpt}</p><div class='full-text'>{full_text.replace('\n', '<br>')}</div>"
    else:
        content = entry.get('content', [{'value': excerpt}])[0]['value']
        body_html = f"<p>{excerpt}</p>{content}<p><a href='{url}'>Source</a></p>"
    
    slug = slugify(title) + "-" + hashlib.md5(url.encode()).hexdigest()[:6]
    
    return (
        article_id, pub_id, system_user_id, title, slug, excerpt, body_html,
        top_image, url, 'published', bias or 'center', 0, datetime.now(), datetime.now(), datetime.now()
    )

async def process_job(session, job, system_user_id):
    job_id, pub_id, rss_url, bias, pub_name = job
    print(f"[{datetime.now()}] Processing: {pub_name} ({rss_url})")
    
    if not rss_url:
        return job_id, 'failed', 'No RSS URL'
    
    feed = await fetch_rss(session, rss_url)
    if not feed or not hasattr(feed, 'entries') or not feed.entries:
        return job_id, 'failed', 'Empty or invalid feed'
    
    # Process entries in parallel (up to 10 per feed to avoid overwhelming single domain)
    tasks = [process_entry(session, entry, pub_id, system_user_id, bias) for entry in feed.entries[:25]]
    results = await asyncio.gather(*tasks)
    
    articles = [r for r in results if r]
    
    if articles:
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            execute_values(cur, """
                INSERT INTO articles (
                    id, publisher_id, author_id, title, slug, excerpt, body_html, 
                    hero_image_url, source_url, status, bias, importance_score, fetched_at, created_at, updated_at
                ) VALUES %s
                ON CONFLICT (id) DO NOTHING
            """, articles)
            conn.commit()
            print(f"[{datetime.now()}] {pub_name}: Inserted {len(articles)} articles")
        except Exception as e:
            print(f"DB Error for {pub_name}: {e}")
            conn.rollback()
        finally:
            conn.close()
            
    return job_id, 'completed', None

async def run_worker():
    print(f"[{datetime.now()}] High-Performance RSS Worker starting...")
    if not DATABASE_URL:
        print("CRITICAL: DATABASE_URL not set.")
        return

    while True:
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            
            cur.execute("SELECT id FROM users WHERE email = %s", (SYSTEM_EMAIL,))
            res = cur.fetchone()
            system_user_id = res[0] if res else None
            
            if not system_user_id:
                print("Error: System user not found in DB.")
                conn.close()
                await asyncio.sleep(60)
                continue

            # 1. Get pending jobs
            cur.execute("""
                SELECT f.id, f.publisher_id, p.rss_url, p.bias_rating, p.name
                FROM fetch_queue f
                JOIN publishers p ON f.publisher_id = p.id
                WHERE f.status = 'pending'
                ORDER BY f.created_at ASC
                LIMIT 50
            """)
            jobs = cur.fetchall()
            conn.close()
            
            if not jobs:
                print("No pending jobs. Sleeping 30s...")
                await asyncio.sleep(30)
                continue

            # Mark as processing
            conn = get_db_connection()
            cur = conn.cursor()
            job_ids = [j[0] for j in jobs]
            cur.execute("UPDATE fetch_queue SET status = 'processing' WHERE id = ANY(%s)", (job_ids,))
            conn.commit()
            conn.close()

            async with aiohttp.ClientSession(headers={"User-Agent": "NewsPlatform-Bot-HighScale/2.0"}) as session:
                tasks = [process_job(session, job, system_user_id) for job in jobs]
                job_results = await asyncio.gather(*tasks)
                
                # Update job statuses
                conn = get_db_connection()
                cur = conn.cursor()
                for job_id, status, error in job_results:
                    if status == 'completed':
                        cur.execute("UPDATE fetch_queue SET status = 'completed' WHERE id = %s", (job_id,))
                        # Also update publisher timestamp
                        cur.execute("""
                            UPDATE publishers 
                            SET last_fetched_at = %s, fail_count = 0 
                            WHERE id = (SELECT publisher_id FROM fetch_queue WHERE id = %s)
                        """, (datetime.now(), job_id))
                    else:
                        cur.execute("UPDATE fetch_queue SET status = 'failed', error = %s WHERE id = %s", (error, job_id))
                conn.commit()
                conn.close()

            print(f"[{datetime.now()}] Batch of {len(jobs)} jobs finished.")
            
        except Exception as e:
            print(f"Worker Loop Error: {e}")
            await asyncio.sleep(10)

if __name__ == "__main__":
    asyncio.run(run_worker())
