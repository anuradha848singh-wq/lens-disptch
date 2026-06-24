import { db } from "../server/db";
import { articles, publishers } from "../shared/schema";
import { eq } from "drizzle-orm";

const biasMapping: Record<string, number> = {
  far_left: -20,
  left: -15,
  center_left: -5,
  center: 0,
  center_right: 5,
  right: 15,
  far_right: 20
};

async function backfillArticles() {
  console.log("Fetching all publishers...");
  const allPublishers = await db.select().from(publishers);
  
  const pubMap = new Map();
  allPublishers.forEach(p => {
    pubMap.set(p.id, p);
  });

  console.log("Fetching all articles...");
  const allArticles = await db.select().from(articles);

  let updated = 0;
  for (const article of allArticles) {
    const pub = pubMap.get(article.sourceId);
    if (pub && pub.biasRating) {
      const expectedScore = biasMapping[pub.biasRating] || 0;
      if (article.biasScore !== expectedScore) {
        await db.update(articles)
          .set({ biasScore: expectedScore })
          .where(eq(articles.id, article.id));
        updated++;
      }
    }
  }

  console.log(`Done! Backfilled ${updated} articles.`);
  process.exit(0);
}

backfillArticles().catch(console.error);
