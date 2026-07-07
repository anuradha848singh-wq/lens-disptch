import { db } from "../db";
import { articles } from "../../shared/schema";
import { sql, ilike } from "drizzle-orm";

async function main() {
  try {
    const mockArticles = await db.select({ id: articles.id, title: articles.title }).from(articles).where(ilike(articles.id, "%mock%"));
    console.log("Mock articles in DB:", mockArticles);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

main();
