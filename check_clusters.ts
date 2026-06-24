import { db } from "./server/db";
import { clusters, articles } from "./shared/schema";
import { desc } from "drizzle-orm";

async function checkClusters() {
  const topClusters = await db.select()
    .from(clusters)
    .orderBy(desc(clusters.sourceCount))
    .limit(10);
    
  console.log("TOP CLUSTERS BY SOURCE COUNT:");
  for (const c of topClusters) {
    console.log(`- ${c.sourceCount} sources: ${c.headline}`);
  }
  process.exit(0);
}

checkClusters().catch(console.error);
