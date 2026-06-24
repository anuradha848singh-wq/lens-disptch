import "dotenv/config";
import { db } from "../server/db";
import { articles } from "../shared/schema";
import { isNull, or, like, sql } from "drizzle-orm";
import { fetchFullContent } from "../server/article-scraper";
import { getFallbackImage } from "../server/processing";

async function main() {
  console.log("=== FIXING ARTICLE IMAGES ===");
  
  let totalFixed = 0;
  let totalScraped = 0;
  let totalFallback = 0;

  while (true) {
    // Find articles with no image or Google thumbnail
    const noImageArticles = await db.select({
      id: articles.id,
      title: articles.title,
      url: articles.url,
      heroImageUrl: articles.heroImageUrl,
    })
    .from(articles)
    .where(
      or(
        isNull(articles.heroImageUrl),
        like(articles.heroImageUrl, "%lh3.googleusercontent.com%"),
        like(articles.heroImageUrl, "%googleusercontent.com%")
      )
    )
    .limit(500); // fix 500 at a time
    
    if (noImageArticles.length === 0) {
      break;
    }
    console.log(`Processing batch of ${noImageArticles.length} articles...`);
    
    for (let i = 0; i < noImageArticles.length; i++) {
      const article = noImageArticles[i];
      let imageUrl: string | null = null;
      try {
        if (!article.url.includes("news.google.com") && !article.url.includes("example.com")) {
          try {
            const content = await fetchFullContent(article.url);
            if (content?.mainImage && !content.mainImage.includes("googleusercontent.com")) {
              imageUrl = content.mainImage;
              totalScraped++;
            }
          } catch {}
        }
      } catch {}

      if (!imageUrl) {
        imageUrl = getFallbackImage("general");
        totalFallback++;
      }
      
      await db.update(articles)
        .set({ heroImageUrl: imageUrl, updatedAt: new Date() })
        .where(sql`id = ${article.id}`);
      
      totalFixed++;
      
      if ((i + 1) % 100 === 0) {
        process.stdout.write(`  Fixed ${totalFixed} total...\r`);
      }
      await new Promise(r => setTimeout(r, 50));
    }
  }
  
  console.log("\n=== RESULTS ===");
  console.log(`Total fixed: ${totalFixed}`);
  console.log(`Scraped real images: ${totalScraped}`);
  console.log(`Used fallbacks: ${totalFallback}`);
  
  // Verify
  const remainingResult = await db.execute(
    sql`SELECT COUNT(*) as count FROM articles WHERE hero_image_url IS NULL OR hero_image_url LIKE '%googleusercontent.com%'`
  );
  console.log(`Still needing image: ${remainingResult.rows[0].count}`);
  
  process.exit(0);
}

main().catch(err => {
  console.error("FAILED:", err);
  process.exit(1);
});
