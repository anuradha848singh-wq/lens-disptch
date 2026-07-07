import { db } from "../db";
import { articles } from "../../shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const stats = await db.select({
      visibilityState: articles.visibilityState,
      count: sql`count(*)`
    }).from(articles).groupBy(articles.visibilityState);
    console.log("Visibility State Stats:", stats);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

main();
