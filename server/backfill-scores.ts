import { db } from "./db";
import { clusters } from "../shared/schema";
import { updateClusterImportance } from "./processing";

async function run() {
  console.log("Fetching all clusters...");
  const allClusters = await db.select().from(clusters);
  console.log(`Found ${allClusters.length} clusters.`);

  for (const cluster of allClusters) {
    try {
      console.log(`Processing cluster ${cluster.id}...`);
      await updateClusterImportance(cluster.id);
    } catch (e) {
      console.error(`Error processing cluster ${cluster.id}:`, e);
    }
  }

  console.log("Done backfilling scores.");
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
