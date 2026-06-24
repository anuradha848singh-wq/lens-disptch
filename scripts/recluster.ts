/**
 * scripts/recluster.ts
 *
 * Re-processes all existing articles through keyword-based clustering (35% Jaccard).
 * Clusters are INSERTed into the DB BEFORE articles are updated to reference them.
 *
 * Usage:
 *   npx tsx scripts/recluster.ts
 */

import "dotenv/config";
import { db } from "../server/db";
import { articles, clusters } from "../shared/schema";
import { eq, sql, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { extractKeywords, keywordJaccard } from "../server/processing";

const JACCARD_THRESHOLD = 0.25;
const WINDOW_MS = 120 * 60 * 60 * 1000; // 120 hours

// ─── In-memory cluster index ──────────────────────────────────────────────────
interface ClusterEntry {
  id: string;           // UUID that is already persisted in the DB
  headline: string;
  keywords: Set<string>;
  lastSeen: number;     // epoch ms
  articleCount: number;
}

const clusterIndex = new Map<string, ClusterEntry>();

// ─── Find matching cluster or insert a new one into the DB ────────────────────
async function findOrInsertCluster(
  title: string,
  publishedMs: number
): Promise<string> {
  const keywords = extractKeywords(title);
  const cutoff = publishedMs - WINDOW_MS;

  // 1. Look for existing cluster with enough keyword overlap
  let bestId: string | null = null;
  let bestScore = 0;
  for (const [id, entry] of clusterIndex) {
    if (entry.lastSeen < cutoff) continue;
    const score = keywordJaccard(keywords, entry.keywords);
    if (score >= JACCARD_THRESHOLD && score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  if (bestId) {
    // Update in-memory state only — no DB write needed for existing clusters
    const c = clusterIndex.get(bestId)!;
    keywords.forEach(w => c.keywords.add(w));
    c.articleCount++;
    c.lastSeen = Math.max(c.lastSeen, publishedMs);
    return bestId;
  }

  // 2. New cluster: INSERT into DB first, THEN return the id
  const newId = randomUUID();
  const headline = title.substring(0, 255);

  await db.execute(sql`
    INSERT INTO clusters (id, headline, summary, source_count, pro_establishment_count, neutral_count, pro_opposition_count, first_seen_at, last_updated_at)
    VALUES (
      ${newId},
      ${headline},
      '',
      1,
      0,
      0,
      0,
      NOW(),
      NOW()
    )
  `);

  // Register in memory AFTER successful DB insert
  clusterIndex.set(newId, {
    id: newId,
    headline,
    keywords,
    lastSeen: publishedMs,
    articleCount: 1,
  });

  return newId;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== RECLUSTER SCRIPT STARTING ===\n");

  // STEP 1: Null out all cluster_ids so FK constraint won't block deletes
  console.log("Step 1: Resetting all cluster_ids to NULL...");
  await db.execute(sql`UPDATE articles SET cluster_id = NULL`);
  console.log("  ✓ Done.\n");

  // STEP 2: Delete all old clusters (safe now that FK refs are nulled)
  console.log("Step 2: Deleting all clusters...");
  await db.execute(sql`DELETE FROM clusters`);
  console.log("  ✓ Done.\n");

  // STEP 3: Load all articles, oldest-first
  console.log("Step 3: Loading articles...");
  const allArticles = await db
    .select({
      id: articles.id,
      title: articles.title,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .orderBy(asc(articles.publishedAt));

  const total = allArticles.length;
  console.log(`  Found ${total} articles to process.\n`);

  // STEP 4: Assign clusters — INSERT cluster first, THEN update article
  console.log("Step 4: Re-clustering...");
  let processed = 0;
  let errors = 0;

  for (const art of allArticles) {
    try {
      const publishedMs = art.publishedAt
        ? new Date(art.publishedAt).getTime()
        : Date.now();

      // This inserts the cluster into the DB before we reference it
      const clusterId = await findOrInsertCluster(art.title, publishedMs);

      // Now safe: cluster row is guaranteed to exist in clusters table
      await db
        .update(articles)
        .set({ clusterId })
        .where(eq(articles.id, art.id));

      processed++;
      if (processed % 100 === 0) {
        process.stdout.write(`  Clustered ${processed}/${total}...\r`);
      }
    } catch (err) {
      errors++;
      console.error(`\n  ✗ Failed on article "${art.id}": ${(err as Error).message}`);
    }
  }

  console.log(`\n  ✓ Clustered ${processed}/${total} articles. Errors: ${errors}\n`);

  // STEP 5: Update source_count for every cluster from the real DB data
  console.log("Step 5: Updating source_counts...");
  await db.execute(sql`
    UPDATE clusters c
    SET source_count = sub.cnt
    FROM (
      SELECT cluster_id, COUNT(DISTINCT source_id) AS cnt
      FROM articles
      WHERE cluster_id IS NOT NULL
      GROUP BY cluster_id
    ) sub
    WHERE c.id = sub.cluster_id
  `);
  console.log("  ✓ Done.\n");

  // STEP 6: Print results
  const allCounts = [...clusterIndex.values()].map(c => c.articleCount);
  const multiSource = allCounts.filter(n => n > 1).length;
  const singleSource = allCounts.filter(n => n === 1).length;
  const maxSize = allCounts.length > 0 ? Math.max(...allCounts) : 0;
  const avg = allCounts.length > 0
    ? (allCounts.reduce((a, b) => a + b, 0) / allCounts.length).toFixed(1)
    : "0";

  console.log("=== RESULTS ===");
  console.log(`Total articles:         ${total}`);
  console.log(`Total clusters created: ${clusterIndex.size}`);
  console.log(`Multi-source clusters:  ${multiSource}`);
  console.log(`Single-article stubs:   ${singleSource}`);
  console.log(`Largest cluster:        ${maxSize} articles`);
  console.log(`Avg articles/cluster:   ${avg}`);
  console.log(`Errors:                 ${errors}`);
  console.log("\n=== VERIFICATION SQL ===");
  console.log(`
-- How many clusters have more than 1 source?
SELECT COUNT(*) AS multi_source_clusters
FROM clusters WHERE source_count > 1;

-- Distribution of cluster sizes
SELECT source_count, COUNT(*) AS num_clusters
FROM clusters
GROUP BY source_count
ORDER BY source_count DESC LIMIT 20;

-- Top 10 biggest clusters
SELECT c.headline, c.source_count, COUNT(a.id) AS article_count
FROM clusters c
JOIN articles a ON a.cluster_id = c.id
GROUP BY c.id, c.headline, c.source_count
ORDER BY article_count DESC LIMIT 10;
`);

  process.exit(0);
}

main().catch(err => {
  console.error("RECLUSTER FAILED:", err);
  process.exit(1);
});
