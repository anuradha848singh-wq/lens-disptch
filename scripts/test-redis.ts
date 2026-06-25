import { db } from "../server/db";
import { articles, clusters } from "../shared/schema";
import { sql, desc, eq } from "drizzle-orm";
import { updateClusterImportance } from "../server/processing";

async function test() {
  const multArtClusters = await db.select({
    clusterId: articles.clusterId,
    count: sql<number>`count(*)`
  })
  .from(articles)
  .where(sql`cluster_id IS NOT NULL`)
  .groupBy(articles.clusterId)
  .orderBy(desc(sql`count(*)`))
  .limit(1);
  
  if (multArtClusters.length > 0) {
    const c = multArtClusters[0];
    console.log(`Running updateClusterImportance for ${c.clusterId}...`);
    try {
      await updateClusterImportance(c.clusterId!);
      console.log("updateClusterImportance completed successfully!");
      
      const cluster = await db.select().from(clusters).where(eq(clusters.id, c.clusterId!)).limit(1);
      console.log(`Updated Cluster sourceCount: ${cluster[0]?.sourceCount}`);
    } catch (err: any) {
      console.error("updateClusterImportance failed with error:", err);
    }
  }
  process.exit(0);
}

test().catch(console.error);
