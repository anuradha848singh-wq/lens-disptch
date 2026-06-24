import { db } from "../server/db";
import { clusters, articles, publishers } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Starting cluster recount...");
  
  // 1. Get all clusters
  const allClusters = await db.select().from(clusters);
  console.log(`Found ${allClusters.length} clusters.`);
  
  let updatedCount = 0;
  
  // 2. For each cluster
  for (const cluster of allClusters) {
    // 3. Get its articles with their publishers
    const clusterArticles = await db.select({
      articleId: articles.id,
      bias: publishers.biasRating
    })
    .from(articles)
    .innerJoin(publishers, eq(articles.sourceId, publishers.id))
    .where(eq(articles.clusterId, cluster.id))
    .execute();
    
    // 4. Recount biases
    let proEstablishmentCount = 0;
    let neutralCount = 0;
    let proOppositionCount = 0;
    
    for (const a of clusterArticles) {
      const b = a.bias || "center";
      if (b === "left") proEstablishmentCount++;
      else if (b === "right") proOppositionCount++;
      else neutralCount++;
    }
    
    // 5. Update if changed
    if (proEstablishmentCount !== cluster.proEstablishmentCount || proOppositionCount !== cluster.proOppositionCount || neutralCount !== cluster.neutralCount) {
      await db.update(clusters).set({
        proEstablishmentCount,
        proOppositionCount,
        neutralCount
      }).where(eq(clusters.id, cluster.id));
      updatedCount++;
    }
  }
  
  console.log(`Finished recalculating counts. Updated ${updatedCount} clusters.`);
  process.exit(0);
}

main().catch(console.error);
