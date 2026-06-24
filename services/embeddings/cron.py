import schedule, time, requests, logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_cluster_job():
    """Every 15 minutes — cluster new unclustered articles"""
    try:
        logger.info("Running cluster job...")
        res = requests.post("http://localhost:8001/cluster-new", timeout=60)
        data = res.json()
        logger.info(f"Clustered {data.get('clustered', 0)} articles")
    except Exception as e:
        logger.error(f"Cluster job failed: {e}")

def rebuild_faiss_index():
    """Every 6 hours — rebuild the full FAISS index from DB"""
    try:
        logger.info("Rebuilding FAISS index...")
        requests.post("http://localhost:8001/rebuild-index", timeout=300)
        logger.info("FAISS index rebuilt")
    except Exception as e:
        logger.error(f"Index rebuild failed: {e}")

schedule.every(15).minutes.do(run_cluster_job)
schedule.every(6).hours.do(rebuild_faiss_index)

logger.info("Cron service started.")
while True:
    schedule.run_pending()
    time.sleep(60)
