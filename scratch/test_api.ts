import { storage } from '../server/storage';
import { db } from '../server/db';
import { articles } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const testId = "c6d6dcd655bb3fdb0298fffba1a465b3";
  console.log("Resolving article:", testId);
  
  // Test storage.getArticle directly
  const article = await storage.getArticle(testId);
  console.log("getArticle result:", article ? "FOUND - " + article.title : "NOT FOUND");

  // Test direct drizzle query
  const [dbArticle] = await db.select().from(articles).where(eq(articles.id, testId));
  console.log("Drizzle direct query result:", dbArticle ? "FOUND - " + dbArticle.title : "NOT FOUND");

  process.exit(0);
}

run();
