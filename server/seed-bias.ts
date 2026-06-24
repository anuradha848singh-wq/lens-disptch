import { db } from "./db";
import { publishers } from "../shared/schema";
import { eq, ilike } from "drizzle-orm";

// Known publisher bias ratings based on AllSides, Ad Fontes Media, MBFC
const BIAS_MAP: Record<string, "pro_opposition" | "neutral" | "pro_establishment"> = {
  // LEFT
  "al jazeera": "pro_opposition",
  "the guardian": "pro_opposition",
  "huffpost": "pro_opposition",
  "huffington post": "pro_opposition",
  "msnbc": "pro_opposition",
  "the wire": "pro_opposition",
  "ndtv": "pro_opposition",
  "daily mirror": "pro_opposition",
  "the independent": "pro_opposition",
  "vox": "pro_opposition",
  "mother jones": "pro_opposition",
  "the nation": "pro_opposition",
  "salon": "pro_opposition",
  "alternet": "pro_opposition",
  "the intercept": "pro_opposition",
  "democracy now": "pro_opposition",
  "jacobin": "pro_opposition",
  "common dreams": "pro_opposition",
  "truthout": "pro_opposition",
  "propublica": "pro_opposition",
  "rawstory": "pro_opposition",
  "mediaite": "pro_opposition",
  "the hindu": "pro_opposition",
  "tribune": "pro_opposition",
  "scroll.in": "pro_opposition",
  "the print": "pro_opposition",
  "wire science": "pro_opposition",
  "altnews": "pro_opposition",
  "newslaundry": "pro_opposition",

  // RIGHT
  "breitbart": "pro_establishment",
  "fox news": "pro_establishment",
  "national review": "pro_establishment",
  "daily telegraph": "pro_establishment",
  "the telegraph": "pro_establishment",
  "new york post": "pro_establishment",
  "daily mail": "pro_establishment",
  "daily express": "pro_establishment",
  "the sun": "pro_establishment",
  "washington examiner": "pro_establishment",
  "the federalist": "pro_establishment",
  "townhall": "pro_establishment",
  "newsmax": "pro_establishment",
  "one america news": "pro_establishment",
  "the blaze": "pro_establishment",
  "daily wire": "pro_establishment",
  "epoch times": "pro_establishment",
  "spectator": "pro_establishment",
  "swarajya": "pro_establishment",
  "opindia": "pro_establishment",
  "pgurus": "pro_establishment",
  "news18": "pro_establishment",
  "republic world": "pro_establishment",
  "times now": "pro_establishment",
  "zee news": "pro_establishment",

  // CENTER
  "bbc": "neutral",
  "bbc news": "neutral",
  "reuters": "neutral",
  "associated press": "neutral",
  "ap news": "neutral",
  "npr": "neutral",
  "abc news": "neutral",
  "cbs news": "neutral",
  "nbc news": "neutral",
  "axios": "neutral",
  "the hill": "neutral",
  "politico": "neutral",
  "bloomberg": "neutral",
  "financial times": "neutral",
  "the economist": "neutral",
  "deutsche welle": "neutral",
  "france 24": "neutral",
  "euronews": "neutral",
  "dw": "neutral",
  "al monitor": "neutral",
  "the straits times": "neutral",
  "south china morning post": "neutral",
  "japan times": "neutral",
  "the times of india": "neutral",
  "economic times": "neutral",
  "mint": "neutral",
  "business standard": "neutral",
  "the new indian express": "neutral",
  "deccan herald": "neutral",
  "greater kashmir": "neutral",
  "techcrunch": "neutral",
  "the verge": "neutral",
  "ars technica": "neutral",
  "wired": "neutral",
  "engadget": "neutral",
  "scientific american": "neutral",
  "new scientist": "neutral",
  "nature": "neutral",
  "science": "neutral",
  "national geographic": "neutral",
  "cnn": "neutral",
  "usa today": "neutral",
  "time": "neutral",
  "newsweek": "neutral",
  "the atlantic": "neutral",
  "new york times": "neutral",
  "washington post": "neutral",
  "los angeles times": "neutral",
  "the east african": "neutral",
  "philstar": "neutral",
  "thenewsminute": "neutral",
  "thenewsminute.com": "neutral",
};

async function seedPublisherBias() {
  console.log("[Bias Seed] Starting publisher bias rating update...");
  
  const allPublishers = await db.select({
    id: publishers.id,
    name: publishers.name,
    slug: publishers.slug,
    biasRating: publishers.biasRating,
  }).from(publishers);

  let updated = 0;
  let skipped = 0;

  for (const pub of allPublishers) {
    // Try to match by name (case insensitive, partial match)
    const nameLower = pub.name.toLowerCase();
    let bias: "pro_opposition" | "neutral" | "pro_establishment" | null = null;

    for (const [key, value] of Object.entries(BIAS_MAP)) {
      if (nameLower.includes(key) || key.includes(nameLower)) {
        bias = value;
        break;
      }
    }

    if (bias && pub.biasRating !== bias) {
      await db.update(publishers)
        .set({ biasRating: bias })
        .where(eq(publishers.id, pub.id));
      console.log(`  [+] ${pub.name} → ${bias}`);
      updated++;
    } else {
      skipped++;
    }
  }

  // Set factuality for known high-quality sources
  const HIGH_FACTUALITY = ["reuters", "associated press", "bbc", "npr", "ap news", "nature", "scientific american", "new scientist"];
  const HIGH_FACTUALITY_SOURCES = ["the guardian", "new york times", "washington post", "financial times", "the economist", "bloomberg"];
  
  for (const pub of allPublishers) {
    const nameLower = pub.name.toLowerCase();
    if (HIGH_FACTUALITY.some(h => nameLower.includes(h))) {
      await db.update(publishers).set({ factualityRating: "very_high" }).where(eq(publishers.id, pub.id));
    } else if (HIGH_FACTUALITY_SOURCES.some(h => nameLower.includes(h))) {
      await db.update(publishers).set({ factualityRating: "high" }).where(eq(publishers.id, pub.id));
    }
  }

  console.log(`[Bias Seed] Done. Updated: ${updated}, Skipped: ${skipped}`);
  process.exit(0);
}

seedPublisherBias().catch(err => {
  console.error("[Bias Seed] Error:", err);
  process.exit(1);
});
