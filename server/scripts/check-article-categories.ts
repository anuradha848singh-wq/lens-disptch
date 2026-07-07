import { db } from "../db";
import { articleCategories } from "../../shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const count = await db.select({ count: sql`count(*)` }).from(articleCategories);
    console.log("Total entries in article_categories:", count[0].count);
    
    const sample = await db.select().from(articleCategories).limit(5);
    console.log("Sample article_categories:", sample);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

main();
