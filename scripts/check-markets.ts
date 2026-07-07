import { db } from "../server/db";
import { clusters } from "../shared/schema";
import { sql } from "drizzle-orm";

async function checkMarkets() {
  const result = await db.select({
    market: clusters.primaryMarket,
    count: sql<number>`count(*)`
  }).from(clusters).groupBy(clusters.primaryMarket);

  console.log("Cluster Primary Market Distribution:");
  result.forEach(row => {
    console.log(`Market: ${row.market === null ? 'NULL' : row.market} | Count: ${row.count}`);
  });

  const allClusters = await db.select({ id: clusters.id, multiMarket: clusters.multiMarket }).from(clusters).limit(20);
  console.log("Sample of multiMarket values:", allClusters.map(c => c.multiMarket));

  process.exit(0);
}

checkMarkets().catch(console.error);
