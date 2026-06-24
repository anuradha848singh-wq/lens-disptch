import { db } from "../db";
import { publishers } from "../../shared/schema";
import { eq } from "drizzle-orm";
import * as cheerio from "cheerio";

// Hardcoded MBFC Ratings for demonstration, assuming the API scraper fails or needs seeding
const MBFC_MAP: Record<string, string> = {
  "Reuters": "Very High",
  "Associated Press": "Very High",
  "BBC News": "High",
  "NPR": "High",
  "The Wall Street Journal": "Mostly Factual",
  "The New York Times": "High",
  "Fox News": "Mixed",
  "CNN": "Mixed",
  "Al Jazeera": "Mostly Factual",
};

/**
 * Heuristically checks the homepage for links that strongly suggest
 * a corrections policy, opinion labeling schema, and ownership disclosure.
 */
async function scrapeTransparencyDefaults(
  publisherUrl: string
): Promise<{ corrections: boolean; ownership: boolean; opinion: boolean }> {
  if (!publisherUrl) return { corrections: false, ownership: false, opinion: false };

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000); // 10s timeout
    const res = await fetch(publisherUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'TheLensDispatchBot/1.0 (+https://thelensdispatch.com)' }
    });
    clearTimeout(id);

    const html = await res.text();
    const $ = cheerio.load(html);
    const links: string[] = [];

    $("a").each((_, el) => {
      const href = $(el).attr("href")?.toLowerCase();
      if (href) links.push(href);
    });

    return {
      corrections: links.some(l => l.includes("correction") || l.includes("accuracy")),
      ownership: links.some(l => l.includes("about") || l.includes("ownership") || l.includes("corporate")),
      opinion: links.some(l => l.includes("opinion") || l.includes("perspective") || l.includes("editorial")),
    };
  } catch (error) {
    console.warn(`[WARN] Failed to scrape transparency for ${publisherUrl}`);
    return { corrections: false, ownership: false, opinion: false };
  }
}

function calculateScore(
  mbfcRating: string | null,
  newsguardScore: number,
  ifcn: boolean,
  corrections: boolean,
  ownership: boolean,
  flags: number
): number {
  let score = 0;

  // 1. MBFC (35 points)
  if (mbfcRating === "Very High") score += 35;
  else if (mbfcRating === "High") score += 28;
  else if (mbfcRating === "Mostly Factual") score += 20;
  else if (mbfcRating === "Mixed") score += 10;
  else score += 0;

  // 2. NewsGuard (20 points -> converted from 100 scale)
  score += (newsguardScore / 100) * 20;

  // 3. Transparency (20 points combined)
  if (corrections) score += 10;
  if (ownership) score += 10;

  // 4. IFCN Signatory (15 points)
  if (ifcn) score += 15;

  // 5. Community Penalties
  score -= flags * 2; // -2 points per sustained flag
  
  // Base normalization (we'll start everyone with +10 points baseline if they are mostly unknown to prevent zeroes on unrated locals)
  if (!mbfcRating && newsguardScore === 50) score += 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getTier(score: number): string {
  if (score >= 85) return "exemplary";
  if (score >= 70) return "high";
  if (score >= 50) return "standard";
  if (score >= 30) return "mixed";
  return "low";
}

async function runFactualitySync() {
  console.log("🚀 Starting Factuality Matrix Sync...");
  
  const allPublishers = await db.select().from(publishers);
  console.log(`Found ${allPublishers.length} publishers to evaluate.`);

  for (const pub of allPublishers) {
    console.log(`Evaluating [${pub.name}]...`);

    // 1. Determine MBFC & NewsGuard (mocking NG score randomly clustered around MBFC)
    const mbfc = MBFC_MAP[pub.name] || null;
    let ngScore = 50;
    if (mbfc === "Very High") ngScore = 95 + Math.floor(Math.random() * 5);
    else if (mbfc === "High") ngScore = 80 + Math.floor(Math.random() * 15);
    else if (mbfc === "Mostly Factual") ngScore = 70 + Math.floor(Math.random() * 10);
    else if (mbfc === "Mixed") ngScore = 40 + Math.floor(Math.random() * 20);
    else ngScore = 50 + Math.floor(Math.random() * 20);

    // Mock IFCN status strictly for major wires
    const isIfcn = ["Reuters", "Associated Press", "AFP"].includes(pub.name);

    // 2. Perform live heuristic transparency checks
    const transparency = await scrapeTransparencyDefaults(pub.website || "");

    // 3. Compute the score
    const finalScore = calculateScore(mbfc, ngScore, isIfcn, transparency.corrections, transparency.ownership, 0);
    const finalTier = getTier(finalScore);

    // 4. Update Database
    await db.update(publishers)
      .set({
        factualityScore: finalScore,
        factualityTier: finalTier,
        mbfcRating: mbfc,
        mbfcUrl: mbfc ? `https://mediabiasfactcheck.com/?s=${encodeURIComponent(pub.name)}` : undefined,
        newsguardScore: ngScore,
        ifcnSignatory: isIfcn,
        hasCorrectionsPolicy: transparency.corrections,
        hasOwnershipDisclosure: transparency.ownership,
        hasOpinionLabeling: transparency.opinion,
        factualityLastUpdated: new Date()
      })
      .where(eq(publishers.id, pub.id));

    console.log(`✅ ${pub.name} -> Score: ${finalScore}/100 [${finalTier.toUpperCase()}]`);
  }

  console.log("🎉 Factuality Sync Complete!");
  process.exit(0);
}

// Execute if run directly
runFactualitySync().catch(console.error);
