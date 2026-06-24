import { db } from "../server/db";
import { publishers } from "../shared/schema";
import { RSS_SOURCES } from "../server/rss-sources";
import { eq } from "drizzle-orm";

async function backfillBiases() {
  console.log("Starting publisher bias backfill...");
  
  let updatedCount = 0;
  for (const [biasTier, sources] of Object.entries(RSS_SOURCES)) {
    for (const source of sources) {
      console.log(`Checking ${source.name} (Should be ${biasTier})...`);
      
      const res = await db.update(publishers)
        .set({ biasRating: biasTier as any })
        .where(eq(publishers.name, source.name))
        .returning();
        
      if (res.length > 0) {
        console.log(`Updated ${source.name} -> ${biasTier}`);
        updatedCount += res.length;
      }
    }
  }
  
  console.log(`Done. Updated ${updatedCount} publishers.`);
  process.exit(0);
}

backfillBiases().catch(err => {
  console.error("Failed to backfill biases", err);
  process.exit(1);
});
