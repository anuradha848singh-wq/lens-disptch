import { db } from "../server/db";
import { clusters, articles, articleCategories, categories } from "../shared/schema";
import { sql, eq } from "drizzle-orm";

async function audit() {
  console.log("=== NEWS PLATFORM AUDIT ===\n");

  // 1. Total Clusters and Articles
  const [{ totalClusters }] = await db.select({ totalClusters: sql<number>`count(*)` }).from(clusters);
  const [{ totalArticles }] = await db.select({ totalArticles: sql<number>`count(*)` }).from(articles);
  console.log(`Total Clusters: ${totalClusters}`);
  console.log(`Total Articles: ${totalArticles}`);

  // 2. Clusters by Market
  const marketCounts = await db.select({
    market: clusters.primaryMarket,
    count: sql<number>`count(*)`
  }).from(clusters).groupBy(clusters.primaryMarket);
  console.log("\nClusters by Primary Market:");
  for (const m of marketCounts) {
    console.log(`- ${m.market || 'Unknown'}: ${m.count}`);
  }

  // 3. Homepage eligible clusters (sourceCount >= 1)
  const [{ eligibleClusters }] = await db.select({ eligibleClusters: sql<number>`count(*)` })
    .from(clusters)
    .where(sql`${clusters.sourceCount} >= 1`);
  console.log(`\nHomepage Eligible Clusters (sourceCount >= 1): ${eligibleClusters}`);

  // 4. Distribution of source counts
  const sourceCountDist = await db.select({
    sourceCount: clusters.sourceCount,
    count: sql<number>`count(*)`
  }).from(clusters).groupBy(clusters.sourceCount).orderBy(clusters.sourceCount);
  console.log("\nDistribution of Source Counts:");
  for (const s of sourceCountDist) {
    console.log(`- ${s.sourceCount} sources: ${s.count} clusters`);
  }

  // 5. Check Categories attached to Articles
  const [{ totalArticleCategories }] = await db.select({ count: sql<number>`count(*)` }).from(articleCategories);
  console.log(`\nTotal Article-Category Mappings: ${totalArticleCategories}`);

  if (totalArticleCategories === 0) {
    console.log("WARNING: No categories are mapped to articles! This means category filters will always return empty.");
  }

  // 5.5 Check visibility states
  const visibilityDist = await db.select({
    visibility: articles.visibilityState,
    count: sql<number>`count(*)`
  }).from(articles).groupBy(articles.visibilityState);
  console.log("\nArticle Visibility States:");
  for (const v of visibilityDist) {
    console.log(`- ${v.visibility}: ${v.count}`);
  }

  // 5.6 Check visibility states of articles in eligible clusters
  const eligibleClusterIds = await db.select({ id: clusters.id }).from(clusters).where(sql`${clusters.sourceCount} >= 1`);
  if (eligibleClusterIds.length > 0) {
    const ids = eligibleClusterIds.map(c => c.id);
    const eligibleVisibilityDist = await db.select({
      visibility: articles.visibilityState,
      count: sql<number>`count(*)`
    }).from(articles)
      .where(sql`${articles.clusterId} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`)
      .groupBy(articles.visibilityState);
    console.log("\nArticle Visibility States (Eligible Clusters Only):");
    for (const v of eligibleVisibilityDist) {
      console.log(`- ${v.visibility}: ${v.count}`);
    }
  }

  // 5.7 Clusters with at least one visible article
  const [{ visibleClusters }] = await db.execute(sql`
    SELECT count(DISTINCT cluster_id) as count 
    FROM ${articles} 
    WHERE visibility_state = 'visible' AND cluster_id IS NOT NULL
  `);
  console.log(`\nClusters with at least one visible article: ${visibleClusters.count}`);

  // 6. Test storage getHomepageClusters function for US
  console.log("\nTesting storage.getHomepageClusters(20, 0, undefined, 'all', 'US')");
  try {
    const { storage } = await import("../server/storage");
    const usClusters = await storage.getHomepageClusters(20, 0, undefined, "all", "US");
    console.log(`Returned ${usClusters.length} clusters for US.`);
    if (usClusters.length > 0) {
      console.log(`Top 3 clusters:`);
      for (const c of usClusters.slice(0, 3)) {
        console.log(` - [${c.primaryMarket}] ${c.headline} (Sources: ${c.sourceCount})`);
      }
    }
  } catch (err) {
    console.error("Error running getHomepageClusters:", err);
  }

  process.exit(0);
}

audit().catch(console.error);
