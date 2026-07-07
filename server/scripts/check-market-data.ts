import { db } from "../db";
import { clusters } from "../../shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const primaryMarkets = await db.select({
      market: clusters.primaryMarket,
      count: sql`count(*)`
    }).from(clusters).groupBy(clusters.primaryMarket);
    
    console.log("Primary Markets distribution:", primaryMarkets);

    const multiMarkets = await db.select({
      multi: clusters.multiMarket,
    }).from(clusters).limit(10);
    console.log("Sample Multi-Markets:", multiMarkets);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

main();
