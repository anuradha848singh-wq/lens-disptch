import { db } from "../db";
import { articles, clusters } from "../../shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const articleCount = await db.select({ count: sql`count(*)` }).from(articles);
    const clusterCount = await db.select({ count: sql`count(*)` }).from(clusters);
    console.log("Articles in DB:", articleCount[0].count);
    console.log("Clusters in DB:", clusterCount[0].count);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

main();
