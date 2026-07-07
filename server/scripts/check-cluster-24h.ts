import { db } from "../db";
import { clusters } from "../../shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const qCount = await db.select({ count: sql`count(*)` })
      .from(clusters)
      .where(sql`first_seen_at > now() - interval '24 hours'`);
    
    // Simulate what the homepage API returns
    // Let's see the homepage query in storage.ts or routes.ts
    // The homepage endpoint calls storage.getHomepageClusters(limit, offset, safeSearch, category, market)
    const { storage } = await import("../storage");
    const homepageData = await storage.getHomepageClusters(50, 0, null, "all", "GLOBAL");
    
    console.log("Clusters created in last 24 hours:", qCount[0].count);
    console.log("Homepage API returned clusters (GLOBAL, 'all', page 1):", homepageData.length);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

main();
