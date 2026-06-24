import { db } from "../db";
import { clusters, articles } from "../../shared/schema";
import { updateClusterImportance } from "../processing";
import { eq, sql } from "drizzle-orm";

async function run() {
  const badClusters = await db.select({ id: clusters.id }).from(clusters).where(eq(clusters.sourceCount, 0));
  console.log(`Found ${badClusters.length} clusters with sourceCount=0. Fixing...`);
  
  for (const c of badClusters) {
    try {
      await updateClusterImportance(c.id);
      console.log(`Fixed cluster ${c.id}`);
    } catch (err) {
      console.error(`Failed to fix ${c.id}`, err);
    }
  }
  
  const badAgain = await db.select({ id: clusters.id, sourceCount: clusters.sourceCount }).from(clusters).where(eq(clusters.sourceCount, 0));
  console.log(`Remaining bad clusters: ${badAgain.length}`);
  
  console.log("Done.");
}

run().catch(console.error);
