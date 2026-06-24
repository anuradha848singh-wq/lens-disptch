import { storage } from "./storage";
import { 
  startAutoFetch, 
  startReclusteringJob 
} from "./news-fetcher";
import { 
  updateClusterAnalytics,
  updatePublisherUniqueness,
  updateHomepageCache,
  runEnrichmentScheduler,
} from "./processing";
import { db } from "./db";
import { clusters, sessions, articles, homepageCache } from "../shared/schema";
import { sql, and, eq } from "drizzle-orm";

// Track all intervals for graceful shutdown
const activeIntervals: NodeJS.Timeout[] = [];
const activeTimeouts: NodeJS.Timeout[] = [];

function trackInterval(fn: () => void, ms: number): NodeJS.Timeout {
  const id = setInterval(fn, ms);
  activeIntervals.push(id);
  return id;
}

function trackTimeout(fn: () => void, ms: number): NodeJS.Timeout {
  const id = setTimeout(fn, ms);
  activeTimeouts.push(id);
  return id;
}

export function stopPipelineScheduler() {
  console.log(`[Scheduler] Stopping ${activeIntervals.length} intervals and ${activeTimeouts.length} timeouts...`);
  activeIntervals.forEach(clearInterval);
  activeTimeouts.forEach(clearTimeout);
  activeIntervals.length = 0;
  activeTimeouts.length = 0;
}

export async function runPipelineScheduler() {
  console.log("[Scheduler] Initializing Semantic News Pipeline...");

  // 1. Initial Fetch & Analysis
  startAutoFetch();
  startReclusteringJob();
  runEnrichmentScheduler();

  // 2. Cluster Analytics & Diversity Audit (Every 10 minutes)
  trackInterval(async () => {
    try {
      console.log("[Scheduler] Starting Cluster Analytics cycle...");
      const allClusters = await storage.listClusters();
      const topClusters = allClusters.slice(0, 100);
      for (const c of topClusters) {
        await updateClusterAnalytics(c.id);
      }
      console.log("[Scheduler] Cluster Analytics complete.");
    } catch (err) {
      console.error("[Scheduler] Cluster Analytics error:", err);
    }
  }, 10 * 60 * 1000);

  // 3. Homepage Slot Refresh (Every 15 minutes)
  const refreshHomepage = async () => {
    try {
      console.log("[Scheduler] Refreshing Homepage Slots...");
      // Explicitly call the DiversityGuard cache builder which creates a fully materialized array
      await updateHomepageCache();

      // Clear Redis cache if applicable
      try {
        const { connection } = await import("./queue");
        await connection.del("homepage:v1");
      } catch (e) {}

      console.log("[Scheduler] Homepage Slots refreshed.");
    } catch (err) {
      console.error("[Scheduler] Homepage refresh error:", err);
    }
  };

  // Initial refresh after a delay to let fetcher + worker process first batch
  // Staggered: 2s (immediate populate), 3min, 5min, then every 5 minutes for steady state
  trackTimeout(refreshHomepage, 2 * 1000);   // First: 2s after start (immediate cache generation)
  trackTimeout(refreshHomepage, 3 * 60 * 1000);  // Second: 3 min
  trackTimeout(refreshHomepage, 5 * 60 * 1000);  // Third: 5 min
  trackInterval(refreshHomepage, 3 * 60 * 1000);  // Then every 3 minutes (was 5)

  // 4. Publisher Reliability & Uniqueness (Every 6 hours)
  trackInterval(async () => {
    try {
      console.log("[Scheduler] Updating Publisher Metrics...");
      const allPublishers = await storage.listPublishers();
      for (const p of allPublishers) {
        await updatePublisherUniqueness(p.id);
      }
      console.log("[Scheduler] Publisher Metrics updated.");
    } catch (err) {
      console.error("[Scheduler] Publisher analytics error:", err);
    }
  }, 6 * 60 * 60 * 1000);

  // 5. Maintenance (Daily) — comprehensive data hygiene
  trackInterval(async () => {
    try {
      console.log("[Scheduler] Running daily maintenance...");
      const maintenanceStart = Date.now();
      
      // ── 5a. Session cleanup ──
      await db.delete(sessions).where(sql`${sessions.expiresAt} < NOW()`);
      console.log("[Scheduler] Expired sessions cleaned up.");
      
      // ── 5b. Article archival (> 30 days old → archived status) ──
      const archiveCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await db.update(articles)
        .set({ status: "archived" as any, visibilityState: "archived" as any })
        .where(and(sql`${articles.publishedAt} < ${archiveCutoff}`, eq(articles.status, "published" as any)));
      console.log("[Scheduler] Articles older than 30 days archived.");

      // ── 5c. HARD DELETE: articles older than 90 days ──
      const hardDeleteCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      await db.delete(articles)
        .where(sql`${articles.publishedAt} < ${hardDeleteCutoff}`);
      console.log(`[Scheduler] Hard-deleted articles older than 90 days.`);

      // ── 5d. Embedding cleanup: archived articles > 14 days ──
      const embeddingCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      try {
        await db.execute(sql`
          DELETE FROM article_embeddings 
          WHERE article_id IN (
            SELECT id FROM articles 
            WHERE status = 'archived' 
            AND published_at < ${embeddingCutoff}
          )
        `);
        console.log("[Scheduler] Stale embeddings for old archived articles cleaned.");
      } catch (embErr) {
        console.warn("[Scheduler] Embedding cleanup skipped (table may not exist):", (embErr as any).message);
      }

      // ── 5e. Orphaned cluster cleanup (clusters with 0 articles) ──
      try {
        await db.execute(sql`
          DELETE FROM clusters 
          WHERE id NOT IN (
            SELECT DISTINCT cluster_id FROM articles WHERE cluster_id IS NOT NULL
          )
        `);
        console.log("[Scheduler] Orphaned clusters (0 articles) pruned.");
      } catch (clusterErr) {
        console.warn("[Scheduler] Orphaned cluster cleanup error:", (clusterErr as any).message);
      }

      const elapsed = Date.now() - maintenanceStart;
      console.log(`[Scheduler] Daily maintenance complete in ${elapsed}ms.`);
    } catch (err) {
      console.error("[Scheduler] Maintenance error:", err);
    }
  }, 24 * 60 * 60 * 1000);
}

