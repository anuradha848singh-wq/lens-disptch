import { db } from "../db";
import { publishers, articles } from "../../shared/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { EXTENDED_PUBLISHER_BIAS_DB } from "../publisher-bias-db";

// Thresholds
const MIN_ARTICLES_FOR_DYNAMIC_SCORE = 5;
const LOOKBACK_DAYS = 30;

// Vocabulary-lean heuristics for India taxonomy
const BIAS_KEYWORDS = {
  pro_establishment: ["development", "infrastructure", "historic", "bold", "visionary", "reform", "growth", "masterstroke", "unprecedented", "global leader"],
  pro_opposition: ["failure", "scam", "unemployment", "crisis", "protest", "draconian", "misuse", "inflation", "backlash", "collapse"],
  regional_aligned: ["federalism", "state rights", "regional", "imposition", "step-motherly", "local identity", "bengal", "tamil", "kerala", "maratha", "telugu"],
  neutral: ["announced", "held", "stated", "reported", "committee", "guidelines", "protocol", "meeting", "scheduled"]
};

function classifyText(text: string): "pro_establishment" | "pro_opposition" | "regional_aligned" | "neutral" {
  if (!text) return "neutral";
  const lower = text.toLowerCase();
  
  const scores = {
    pro_establishment: 0,
    pro_opposition: 0,
    regional_aligned: 0,
    neutral: 0
  };

  for (const [bucket, words] of Object.entries(BIAS_KEYWORDS)) {
    for (const word of words) {
      if (lower.includes(word)) {
        scores[bucket as keyof typeof scores]++;
      }
    }
  }

  // Find bucket with max score
  let maxBucket = "neutral";
  let maxScore = 0;
  for (const [bucket, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxBucket = bucket;
    }
  }
  
  if (maxScore === 0) return "neutral";
  return maxBucket as any;
}

async function runDynamicScorer() {
  console.log("🚀 Starting Dynamic Bias & Factuality Scorer...");
  
  const allPublishers = await db.select().from(publishers);
  console.log(`Evaluating ${allPublishers.length} publishers...`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - LOOKBACK_DAYS);

  for (const pub of allPublishers) {
    // 1. Fetch articles in the last 30 days
    const recentArticles = await db.select()
      .from(articles)
      .where(and(
        eq(articles.sourceId, pub.id),
        gte(articles.createdAt, cutoffDate)
      ));

    if (recentArticles.length < MIN_ARTICLES_FOR_DYNAMIC_SCORE) {
      // Revert to cold-start default if not enough data
      const coldStart = Object.entries(EXTENDED_PUBLISHER_BIAS_DB).find(([domain, p]: any) => domain === pub.website?.replace(/^https?:\/\//, '').replace(/\/$/, ''))?.[1];
      console.log(`[${pub.name}] Not enough articles (${recentArticles.length}). Keeping defaults.`);
      continue;
    }

    // 2. Factuality Input: Corrections & Sensationalism
    let totalQuality = 0;
    let correctionsCount = 0;
    const biasTallies = {
      pro_establishment: 0,
      pro_opposition: 0,
      regional_aligned: 0,
      neutral: 0
    };

    for (const art of recentArticles) {
      totalQuality += art.qualityScore || 50;

      const fullText = `${art.title} ${art.excerpt || ""} ${art.bodyClean || ""}`;
      
      // Heuristic for corrections
      if (fullText.toLowerCase().includes("correction:") || fullText.toLowerCase().includes("update:")) {
        correctionsCount++;
      }

      // Classify
      const label = classifyText(fullText);
      biasTallies[label]++;
    }

    const avgQuality = totalQuality / recentArticles.length;
    // Sensationalism is roughly inverse of quality
    const sensationalismScore = Math.max(0, 100 - avgQuality);
    
    // Factuality heuristic: better quality + responsible corrections = higher factuality
    // Too many corrections = sloppy, but some corrections = transparent.
    let dynamicFactuality = avgQuality;
    if (correctionsCount > 0) {
      dynamicFactuality += 5; // Reward transparency
    }
    dynamicFactuality = Math.min(100, dynamicFactuality);

    // Determine primary bias dynamically
    let dominantBias = "neutral";
    let maxTally = -1;
    for (const [bucket, count] of Object.entries(biasTallies)) {
      if (count > maxTally) {
        maxTally = count;
        dominantBias = bucket;
      }
    }

    console.log(`[${pub.name}] Analysed ${recentArticles.length} articles.`);
    console.log(`   -> Avg Quality: ${avgQuality.toFixed(1)}, Sensationalism: ${sensationalismScore.toFixed(1)}`);
    console.log(`   -> Factuality: ${dynamicFactuality.toFixed(1)}`);
    console.log(`   -> Dynamic Bias: ${dominantBias} (Tallies: ${JSON.stringify(biasTallies)})`);

    // Update the publisher record
    await db.update(publishers)
      .set({
        biasRating: dominantBias,
        factualityScore: Math.round(dynamicFactuality),
        factualityLastUpdated: new Date()
      })
      .where(eq(publishers.id, pub.id));
  }

  console.log("🎉 Dynamic Scorer Complete!");
  process.exit(0);
}

runDynamicScorer().catch(console.error);
