import { db } from "../db";
import { articles, articleCategories, categories } from "../../shared/schema";
import { sql, notExists, eq } from "drizzle-orm";
import { guessCategory } from "../processing";

async function main() {
  try {
    // 1. Load categories and map slug -> id
    const cats = await db.select().from(categories);
    const categoryMap = new Map<string, string>();
    const keywordsToCategory: Record<string, string> = {
      // Politics
      'election': 'politics', 'vote': 'politics', 'campaign': 'politics',
      'biden': 'politics', 'trump': 'politics', 'congress': 'politics',
    };
    cats.forEach(c => {
      categoryMap.set(c.slug, c.id);
    });

    console.log("Categories mapped:", categoryMap);

    // 2. Fetch articles that DO NOT have any entry in article_categories
    // Since there are ~11k, let's fetch them in batches or all of them if memory permits.
    // Drizzle select with notExists
    console.log("Fetching articles with missing categories...");
    const missingArticles = await db.select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt
    })
    .from(articles)
    .where(
      notExists(
        db.select()
          .from(articleCategories)
          .where(eq(articleCategories.articleId, articles.id))
      )
    );

    console.log(`Found ${missingArticles.length} articles with missing categories.`);

    if (missingArticles.length === 0) {
      console.log("No backfill needed.");
      process.exit(0);
    }

    // 3. Batch insert categories
    const batchSize = 500;
    let insertedCount = 0;
    
    for (let i = 0; i < missingArticles.length; i += batchSize) {
      const chunk = missingArticles.slice(i, i + batchSize);
      const valuesToInsert = chunk.map(art => {
        const slug = guessCategory(art.title, art.excerpt || "");
        const categoryId = catMap[slug] || catMap["politics"];
        return {
          articleId: art.id,
          categoryId
        };
      });

      if (valuesToInsert.length > 0) {
        await db.insert(articleCategories).values(valuesToInsert).onConflictDoNothing();
        insertedCount += valuesToInsert.length;
        console.log(`Progress: Backfilled ${insertedCount}/${missingArticles.length} articles.`);
      }
    }

    console.log("Category backfill completed successfully!");

  } catch (e) {
    console.error("Backfill failed:", e);
  }
  process.exit(0);
}

main();
