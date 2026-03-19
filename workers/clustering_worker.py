import os
import psycopg2
from psycopg2.extras import execute_values
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from datetime import datetime, timedelta
import time
from dotenv import load_dotenv
import uuid

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SIMILARITY_THRESHOLD = 0.65  # Adjust based on testing
BATCH_SIZE = 500

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

def run_clustering():
    print(f"[{datetime.now()}] AI Clustering Worker starting...")
    
    if not DATABASE_URL:
        print("CRITICAL: DATABASE_URL not set.")
        return

    while True:
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            
            # 1. Fetch recent articles that need clustering
            # We look at the last 48 hours to find matches
            since = datetime.now() - timedelta(hours=48)
            cur.execute("""
                SELECT id, title, excerpt, cluster_id 
                FROM articles 
                WHERE fetched_at > %s
                ORDER BY fetched_at DESC
                LIMIT %s
            """, (since, BATCH_SIZE))
            
            rows = cur.fetchall()
            if not rows or len(rows) < 2:
                print("Not enough articles to cluster. Waiting...")
                conn.close()
                time.sleep(60)
                continue

            ids = [r[0] for r in rows]
            # Combine title and excerpt for better matching
            texts = [f"{r[1]} {r[2]}" for r in rows]
            existing_clusters = {r[0]: r[3] for r in rows if r[3]}
            
            # 2. Vectorize using TF-IDF
            vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
            tfidf_matrix = vectorizer.fit_transform(texts)
            
            # 3. Calculate Cosine Similarity
            sim_matrix = cosine_similarity(tfidf_matrix)
            
            # 4. Clustering Logic (Greedy Grouping)
            assigned_clusters = {} # article_id -> cluster_id
            cluster_members = {}   # cluster_id -> [article_ids]
            
            visited = set()
            
            for i in range(len(ids)):
                if i in visited: continue
                
                article_id = ids[i]
                
                # Check if this article already belongs to a cluster from previous runs
                current_cluster_id = existing_clusters.get(article_id) or str(uuid.uuid4())
                
                group = [article_id]
                visited.add(i)
                
                for j in range(i + 1, len(ids)):
                    if j not in visited and sim_matrix[i][j] > SIMILARITY_THRESHOLD:
                        group.append(ids[j])
                        visited.add(j)
                
                assigned_clusters[article_id] = current_cluster_id
                cluster_members[current_cluster_id] = group
                for member_id in group:
                    assigned_clusters[member_id] = current_cluster_id

            # 5. Update Database
            # For each cluster, calculate importance score based on source density
            for cluster_id, members in cluster_members.items():
                # Score = (number of unique sources) * scale
                # We'll just use member count for now as a proxy for importance
                importance_score = min(100, len(members) * 15)
                
                for m_id in members:
                    cur.execute("""
                        UPDATE articles 
                        SET cluster_id = %s, importance_score = %s 
                        WHERE id = %s
                    """, (cluster_id, importance_score, m_id))
            
            conn.commit()
            conn.close()
            print(f"[{datetime.now()}] Processed {len(ids)} articles. Created/Updated {len(cluster_members)} clusters.")
            
        except Exception as e:
            print(f"Clustering Error: {e}")
            if 'conn' in locals() and conn: conn.close()
            
        time.sleep(300) # Run every 5 minutes

if __name__ == "__main__":
    run_clustering()
