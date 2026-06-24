import { db } from "../db";
import { articles, articleEmbeddings } from "../../shared/schema";
import { embeddingService } from "../lib/embeddings-client";
import { eq, sql } from "drizzle-orm";
import "dotenv/config";

async function backfill() {
  console.log("[Backfill] Starting embedding backfill...");
  
  // Query all articles that are not yet embedded inside the article_embeddings table
  const unembedded = await db.execute(sql`
    SELECT id, title, excerpt FROM articles 
    WHERE id NOT IN (SELECT article_id FROM article_embeddings)
    LIMIT 500
  `);

  const rows = unembedded.rows;
  console.log(`[Backfill] Found ${rows.length} articles without Jina embeddings`);

  let done = 0;
  for (const article of rows) {
    try {
      await embeddingService.embedArticle({
        id: article.id as string,
        title: article.title as string,
        excerpt: article.excerpt as string | null,
      });
      done++;
      if (done % 5 === 0) {
        console.log(`[Backfill] Processed ${done}/${rows.length} articles...`);
      }
      // Protect Jina free tier concurrency limits
      await new Promise(r => setTimeout(r, 150));
    } catch (err: any) {
      console.error(`[Backfill] Failed for article ${article.id}:`, err.message);
    }
  }

  console.log(`[Backfill] Complete. Embedded ${done} articles successfully!`);
  process.exit(0);
}

backfill().catch(err => {
  console.error("[Backfill] Script crashed:", err);
  process.exit(1);
});
