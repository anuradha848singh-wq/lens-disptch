import { storage } from "./storage";
import { type Article, articles, clusters, publishers, type Category, type Tag, type ArticleWithDetails, calculateCosineSimilarity, type FetchQueue, type Bias } from "../shared/schema";
import { eq, desc, and, sql, gte, inArray, lt, lte } from "drizzle-orm";
import * as crypto from "crypto";
import { EXTENDED_PUBLISHER_BIAS_DB, type PublisherInfo } from "./publisher-bias-db";
import { fetchFullContent } from "./article-scraper";
import { db } from "./db";
import { recordClusterEvent } from "./metrics";
import { embeddingService } from "./lib/embeddings-client";
import { QUALITY_GATES } from "./rss-sources";

const PUBLISHER_BIAS_DB: Record<string, PublisherInfo> = EXTENDED_PUBLISHER_BIAS_DB;

export interface ArticleToProcess {
  title: string;
  description?: string;
  content?: string;
  url: string;
  image?: string;
  publishedAt: string;
  source: {
    name: string;
    url?: string;
  };
  embedding?: string | number[] | null;
  domain?: string;
  entities?: any;
  trace?: Record<string, any>;
}

export interface ArticleContext {
  id: string;
  title: string;
  description: string;
  publishedAt: string | null;
  clusterId: string;
  embedding?: number[] | null;
}

export function generateEmbedding(text: string): number[] {
  const tokens = text.toLowerCase().split(/\W+/).filter(t => t.length > 3);
  const vector = new Array(768).fill(0);
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % 768;
    vector[idx] += 1;
  }
  // Normalize
  const mag = Math.sqrt(vector.reduce((a, b) => a + b * b, 0));
  return vector.map(v => mag > 0 ? v / mag : 0);
}


/**
 * A basic TF-IDF style vectorizer for narrative divergence tracking.
 */
export function buildTFIDF(text: string): number[] {
  const tokens = text.toLowerCase().split(/\W+/).filter(t => t.length > 3);
  const vector = new Array(128).fill(0);
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % 128;
    vector[idx] += 1;
  }
  return vector;
}


/**
 * Generates a neutral, representative headline for a cluster of articles.
 */
export function generateClusterTitle(clusterArticles: any[]): string {
  if (clusterArticles.length === 0) return "Global News Update";

  let bestTitle = clusterArticles[0].title;
  let maxCommonality = -1;

  for (const art of clusterArticles) {
    const entities = extractEntities(art.title, art.bodyClean || "");
    const entityCount = entities.persons.size + entities.locations.size + entities.organizations.size;
    const score = entityCount - (art.title.length / 100);

    if (score > maxCommonality) {
      maxCommonality = score;
      bestTitle = art.title;
    }
  }
  return bestTitle.split(" - ")[0].split(" | ")[0].trim();
}


// ─── Stop-word set for keyword clustering ─────────────────────────────────
const CLUSTER_STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "up", "about", "into", "over", "after",
  "this", "that", "these", "those", "is", "are", "was", "were", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "shall", "can", "not",
  "its", "it", "as", "he", "she", "they", "we", "you", "who", "what",
  "when", "where", "how", "which", "there", "their", "them", "than",
  "also", "just", "so", "if", "then", "now", "new", "more", "says",
  "said", "say", "gets", "get", "after", "amid", "amid", "amid",
]);

/**
 * Extract meaningful keywords from a title (stop-word filtered, length ≥ 3).
 */
export function extractKeywords(title: string): Set<string> {
  return new Set(
    title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length >= 3 && !CLUSTER_STOP_WORDS.has(w))
  );
}

/**
 * Structured entity sets for weighted similarity.
 */
export interface EnrichedEntities {
  persons: Set<string>;
  organizations: Set<string>;
  locations: Set<string>;
  misc: Set<string>;
}

/**
 * Extract named entities (Proper Nouns) from title/excerpt for better matching.
 * Categorizes into persons, organizations, and locations using specific regex patterns.
 */
export function extractEntities(title: string, description: string): EnrichedEntities {
  const text = `${title} ${description || ""}`;
  const entities: EnrichedEntities = {
    persons: new Set(),
    organizations: new Set(),
    locations: new Set(),
    misc: new Set(),
  };

  // 1. Persons (Basic: Cap Word followed by Cap Word, excluding common org/loc suffixes)
  // e.g. "Donald Trump", "Joe Biden", "Narendra Modi"
  const personMatches = text.match(/\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g) || [];
  const orgSuffixes = /\b(Corp|Inc|Ltd|Dept|Agency|Group|Bank|University|Association|Council|Commission)\b/i;
  const locSuffixes = /\b(City|State|Country|River|Island|Mount|Region|Ocean|Sea|Bay)\b/i;

  personMatches.forEach(p => {
    if (!orgSuffixes.test(p) && !locSuffixes.test(p)) {
      entities.persons.add(p);
    }
  });

  // 2. Organizations / Acronyms
  // e.g. "NASA", "FBI", "Apple", "Microsoft", "United Nations"
  const acronyms = text.match(/\b[A-Z]{2,5}\b/g) || [];
  acronyms.forEach(e => entities.organizations.add(e));

  const orgMatches = text.match(/\b[A-Z][a-z]+ (?:Corp|Inc|Ltd|Group|Bank|University|Systems|Technologies|Motors|Airways)\b/g) || [];
  orgMatches.forEach(e => entities.organizations.add(e));

  // 3. Locations
  // e.g. "Israel", "Gaza", "Washington", "New York", "Ukraine"
  const places = text.match(/\b(Israel|Gaza|Ukraine|Russia|China|Taiwan|India|Pakistan|USA|UK|London|Paris|Berlin|Tokyo|Beijing|Moscow|Tehran|Hormuz|Baghdad|Kyiv)\b/g) || [];
  places.forEach(e => entities.locations.add(e));

  // 4. Misc / Single Proper Nouns
  const singleProper = text.match(/\b[A-Z][a-z]{3,}\b/g) || [];
  singleProper.forEach(e => {
    if (!entities.persons.has(e) && !entities.organizations.has(e) && !entities.locations.has(e)) {
      entities.misc.add(e);
    }
  });

  return entities;
}

/**
 * Calculates weighted Jaccard similarity for entity sets.
 * Weights: Persons (0.5), Locations (0.3), Organizations (0.2).
 */
export function calculateWeightedEntitySimilarity(a: EnrichedEntities, b: EnrichedEntities): number {
  const scorePerson = keywordJaccard(a.persons, b.persons);
  const scoreLoc = keywordJaccard(a.locations, b.locations);
  const scoreOrg = keywordJaccard(a.organizations, b.organizations);
  const scoreMisc = keywordJaccard(a.misc, b.misc);

  return (scorePerson * 0.45) + (scoreLoc * 0.30) + (scoreOrg * 0.15) + (scoreMisc * 0.10);
}

/**
 * Generates 3-gram character shingles for near-duplicate title detection.
 */
export function generateShingles(text: string, n = 3): Set<string> {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
  const shingles = new Set<string>();
  for (let i = 0; i <= normalized.length - n; i++) {
    shingles.add(normalized.substring(i, i + n));
  }
  return shingles;
}

/**
 * Calculates shingle-based similarity (Jaccard on shingles).
 */
export function calculateShingleSimilarity(a: string, b: string): number {
  const shinglesA = generateShingles(a);
  const shinglesB = generateShingles(b);
  if (shinglesA.size === 0 || shinglesB.size === 0) return 0;

  const intersect = Array.from(shinglesA).filter(s => shinglesB.has(s)).length;
  const union = new Set([...Array.from(shinglesA), ...Array.from(shinglesB)]).size;
  return intersect / union;
}

/**
 * Convert a publisher bias string label to a numeric score (-100 to +100).
 * Negative = left, positive = right, 0 = center.
 */
export function biasLabelToScore(bias: string): number {
  const b = (bias || "neutral").toLowerCase();
  if (b === "far-left" || b === "pro_opposition") return -75;
  if (b === "pro_opposition") return -50;
  if (b === "lean-left" || b === "lean_left") return -25;
  if (b === "neutral") return 0;
  if (b === "lean-right" || b === "lean_right") return 25;
  if (b === "pro_establishment") return 50;
  if (b === "far-right" || b === "pro_establishment") return 75;
  return 0;
}

/**
 * Jaccard similarity between two keyword sets.
 */
export function keywordJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = [...a].filter(w => b.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : 0;
}

// Existing lookupPublisherInfo removed in favor of domain-aware version below

/**
 * O-curve scoring for word count. 
 * Peaks at 800-1200 words (deep reporting).
 * Penalizes < 300 words (stub) and > 3000 words (undigested dump).
 */
export function scoreWordCount(count: number): number {
  if (count < 100) return 0;
  if (count < 300) return 40;
  if (count < 800) return 70 + (count - 300) * 0.06; // Linear climb
  if (count <= 1200) return 100; // Plateau of excellence
  if (count <= 2000) return 100 - (count - 1200) * 0.025; // Gradual decay
  return Math.max(40, 80 - (count - 2000) * 0.01); // Long form floor
}

/**
 * Basic Flesch-Kincaid Readability approximation.
 * Returns a score from 0-100 (higher is easier).
 */
export function scoreReadability(text: string): number {
  if (!text || text.length < 50) return 50;
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.length > 5);
  if (words.length === 0 || sentences.length === 0) return 50;

  const avgSentenceLength = words.length / sentences.length;
  // Approximating syllables by counting vowel groups
  const syllables = text.toLowerCase().match(/[aeiouy]{1,2}/g)?.length || words.length;
  const avgSyllablesPerWord = syllables / words.length;

  const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  return Math.min(100, Math.max(0, score));
}

/**
 * Robust quality scoring based on title, content, and publisher metrics.
 * Implements the Part 2 Quality Scoring specification.
 */
export function scoreArticle(article: any, publisher: { quality: number, biasTier: string }): {
  score: number,
  approved: boolean,
  flags: string[],
  tier: string
} {
  let score = 100;
  const flags: string[] = [];

  // --- TITLE ---
  const title = article.title || "";
  if (title.length < 20) { score -= 30; flags.push("title too short"); }

  // Enhanced clickbait detection — 40+ patterns
  const CLICKBAIT = [
    // Classic clickbait
    "you won't believe", "you will never believe", "you'll never guess",
    "shocking", "mind blowing", "mind-blowing",
    "watch what", "here's why", "this is why",
    "!!!", "???", "must read", "must see", "must watch",
    "everything you need to know", "this one trick",
    "wait until you see", "gone viral", "going viral",
    "what happens next", "secret to", "simple trick",
    "incredible discovery", "miracle cure",
    "breaking alert",
    // Sensationalism
    "destroyed", "obliterated", "slammed", "ripped apart",
    "claps back", "fires back", "blasts",
    "epic fail", "total disaster", "insane",
    // Emotional manipulation
    "heartbreaking", "jaw-dropping", "gut-wrenching",
    "can't stop laughing", "had us in tears",
    "will make you cry", "will restore your faith",
    // Non-news / entertainment
    "fans are going crazy", "internet reacts", "internet is divided",
    "spotted wearing", "flaunts", "stuns in",
    "you need to try", "life hack", "game changer",
    // Question bait
    "is this the end", "has it come to this",
  ];
  if (CLICKBAIT.some(p => title.toLowerCase().includes(p))) {
    score -= 35; flags.push("clickbait title");
  }

  // Listicle check (e.g. "10 Things You..." "25 Reasons Why...")
  if (/^\d+\s+(things|reasons|ways|signs|secrets|facts|tips|hacks|rules|steps)\b/i.test(title)) {
    score -= 20; flags.push("listicle title");
  }

  const capsWords = title.split(/\s+/).filter((w: string) => /^[A-Z]{3,}$/.test(w));
  if (capsWords.length > 2) { score -= 15; flags.push("excessive caps"); }

  // --- CONTENT ---
  const fullContent = article.bodyClean || article.content || article.description || article.excerpt || "";
  const wordCount = article.wordCount || fullContent.split(/\s+/).filter((w: any) => w.length > 0).length;

  // FIX: RSS-ingested articles only have title + excerpt (< 200 words) by design.
  // The Enrichment Manager will scrape full content later for hot stories.
  // Don't penalize metadata-only articles for being short.
  const isMetadataOnly = article.trace?.status === "metadata_only" || article.trace?.tiered_ingestion;

  if (article.trace?.isPaywalled || isMetadataOnly) {
    // Skip thin content penalties for paywalled or RSS-stub articles
    if (isMetadataOnly) flags.push("metadata_only — content scoring deferred");
  } else {
    if (wordCount < 200) {
      score -= 60;
      flags.push("critically thin content (<200 words)");
    } else {
      const wcScore = scoreWordCount(wordCount);
      if (wcScore < 50) { score -= 20; flags.push("low word count/quality"); }
      else if (wcScore < 75) { score -= 10; flags.push("thin content"); }
    }
  }

  const readability = scoreReadability(fullContent);
  if (readability < 30 && !article.trace?.isPaywalled && !isMetadataOnly) { score -= 15; flags.push("poor readability"); }

  const excerpt = article.excerpt || article.description || "";
  if (excerpt.length < 50) { score -= 10; flags.push("excerpt too short"); }

  const PAYWALL = ["subscribe to read", "sign in to continue", "premium content", "limited time offer"];
  if (PAYWALL.some(p => excerpt.toLowerCase().includes(p) || fullContent.toLowerCase().includes(p))) {
    if (!article.trace?.isPaywalled) {
      score -= 40; flags.push("paywalled");
    }
  }

  // --- PUBLISHER QUALITY ---
  const pubQuality = publisher.quality || 50;
  if (pubQuality < 40) { score -= 35; flags.push("very low quality publisher"); }
  else if (pubQuality < 60) { score -= 15; flags.push("low quality publisher"); }

  // --- EXTRA PENALTY FOR EXTREME TIERS ---
  const biasTier = publisher.biasTier || "neutral";
  if (biasTier === "pro_opposition" || biasTier === "pro_establishment") {
    if (!article.author) {
      score -= 20; flags.push("no byline — required for extreme bias tier");
    }
    if (wordCount < 500) {
      score -= 20; flags.push("content too short for extreme bias tier");
    }
  }

  // --- FRESHNESS ---
  const pubDate = article.publishedAt ? new Date(article.publishedAt).getTime() : Date.now();
  const hoursOld = (Date.now() - pubDate) / (1000 * 60 * 60);
  if (hoursOld > 72) score -= 10;
  if (hoursOld > 168) score -= 25;

  const minQuality = (QUALITY_GATES as any)[biasTier] || 60;

  return {
    score: Math.round(Math.max(0, score)),
    approved: score >= minQuality,
    flags,
    tier: (
      score >= 85 ? "premium" :
        score >= 65 ? "standard" :
          score >= 50 ? "low" : "rejected"
    )
  };
}

// Backward compatibility alias
export function calculateQualityScore(art: any, pubInfo: any): number {
  const result = scoreArticle(art, {
    quality: pubInfo.factualityScore || 50,
    biasTier: pubInfo.biasRating || "neutral"
  });
  return result.score;
}

export function determineVisibility(qualityScore: number, importanceScore: number): "visible" | "low_priority" | "hidden" {
  if (qualityScore < 15) return "hidden";
  if (qualityScore < 30) return "low_priority";
  return "visible";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 200);
}

export function guessCategory(title: string, description?: string): string {
  const text = `${title} ${description || ""}`.toLowerCase();
  if (/politic|election|congress|senate|white house|parliament|government|democrat|republican|vote|legislat|sanctions|treaty|modi|bjp|lok sabha|rajya sabha/.test(text)) return "politics";
  if (/tech| ai |artificial|software|algorithm|semiconductor|cloud|compute|startup|cyber|robot|app|iphone|android|social media/.test(text)) return "technology";
  if (/business|economy|stock|market|nasdaq|dow jones|gdp|inflation|trade|finance|bank|crypto|bitcoin|investing|earnings|ceo|sensex|nifty|rupee/.test(text)) return "business";
  if (/health|medical|doctor|hospital|science|research|vaccine|drug|disease|mental|covid|cancer|surgery|biology/.test(text)) return "health";
  if (/sport|game|team|player|league|championship|cup|tournament|stadium|medal|football|basketball|soccer|tennis|cricket|ipl/.test(text)) return "sports";
  if (/world|global|international|nation|foreign|conflict|war|peace|summit|un |nato|eu |europe|africa|asia|middle east/.test(text)) return "world";
  if (/movie|film|actor|music|song|album|concert|celebrity|hollywood|bollywood|netflix|streaming|theater|entertainment/.test(text)) return "entertainment";
  return "politics";
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 3 — CLUSTER SLOT SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export const SLOTS: Record<string, { min: number, target: number, max: number }> = {
  "pro_establishment": { min: 1, target: 2, max: 3 },
  "pro_opposition": { min: 1, target: 2, max: 3 },
  "regional_aligned": { min: 1, target: 1, max: 2 },
  "neutral": { min: 1, target: 2, max: 3 },
};

export function fillCluster(candidates: any[]): {
  articles: any[],
  total: number,
  byTier: Record<string, number>,
  gaps: any[],
  isBlindspot: boolean,
  blindspotSide: string | null,
  rejected: number,
  shannonDiversity: number
} {
  const buckets: Record<string, any[]> = {
    "pro_establishment": [], "pro_opposition": [], "regional_aligned": [], "neutral": []
  };
  let rejected = 0;

  for (const article of candidates) {
    const pubInfo = article.publisher || {};
    const quality = scoreArticle(article, {
      quality: pubInfo.factualityScore || 50,
      biasTier: pubInfo.biasRating || "neutral"
    });

    if (!quality.approved) {
      rejected++;
      continue;
    }

    const tier = pubInfo.biasRating || "neutral";
    if (buckets[tier]) buckets[tier].push(article);
    else buckets["neutral"].push(article);
  }

  // Sort by quality within each bucket
  for (const tier in buckets) {
    buckets[tier].sort((a, b) => (b.publisher?.reliabilityScore || 50) - (a.publisher?.reliabilityScore || 50));
  }

  const selected: Record<string, any[]> = {
    "pro_establishment": buckets["pro_establishment"].slice(0, SLOTS["pro_establishment"].max),
    "pro_opposition": buckets["pro_opposition"].slice(0, SLOTS["pro_opposition"].max),
    "regional_aligned": buckets["regional_aligned"].slice(0, SLOTS["regional_aligned"].max),
    "neutral": buckets["neutral"].slice(0, SLOTS["neutral"].max),
  };

  const coverageGaps: any[] = [];
  const sides: Record<string, number> = {};

  for (const tier in SLOTS) {
    sides[tier] = selected[tier].length;
    if (sides[tier] < SLOTS[tier].min) {
      coverageGaps.push({ tier, have: sides[tier], need: SLOTS[tier].min - sides[tier] });
    }
  }

  const ordered = [
    ...selected["pro_establishment"],
    ...selected["pro_opposition"],
    ...selected["regional_aligned"],
    ...selected["neutral"]
  ];

  const shannonDiversity = calculateShannonDiversity(buckets);

  const counts = [
    { side: "pro_establishment", count: sides["pro_establishment"] },
    { side: "pro_opposition", count: sides["pro_opposition"] },
    { side: "regional_aligned", count: sides["regional_aligned"] },
    { side: "neutral", count: sides["neutral"] },
  ];
  const maxCount = Math.max(...counts.map(c => c.count));
  const missing = counts.filter(c => c.count === 0);
  const isBlindspot = missing.length > 0 && missing.length < 4 && maxCount >= 2;
  const blindspotSide = isBlindspot ? missing[0].side : null;

  return {
    articles: ordered,
    total: ordered.length,
    byTier: sides,
    gaps: coverageGaps,
    isBlindspot,
    blindspotSide,
    rejected,
    shannonDiversity
  };
}

export function calculateShannonDiversity(buckets: Record<string, any[]>): number {
  let proEstablishmentCount = (buckets["pro_establishment"] || []).length;
  let proOppositionCount = (buckets["pro_opposition"] || []).length;
  let regionalAlignedCount = (buckets["regional_aligned"] || []).length;
  let neutralCount = (buckets["neutral"] || []).length;

  let total = proEstablishmentCount + proOppositionCount + regionalAlignedCount + neutralCount;
  if (total === 0) return 0;

  let result = 0;
  [proEstablishmentCount, proOppositionCount, regionalAlignedCount, neutralCount].forEach(count => {
    if (count > 0) {
      let p = count / total;
      result -= p * Math.log(p);
    }
  });

  // Normalize by max diversity ln(4) ~ 1.386 to get 0-100
  return Number(((result / Math.log(4)) * 100).toFixed(1));
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 4 — MASTER IMPORTANCE SCORE (Source + Bias + Recency + Velocity + Quality)
// ─────────────────────────────────────────────────────────────────────────────

export const MAJOR_SOURCES = ["associated press", "reuters", "bbc", "bloomberg", "the economist", "new york times", "washington post", "wall street journal", "afp", "al jazeera", "reuters", "tass", "cctv", "dw", "france 24", "sky news", "upi"];

export function calculateMasterImportanceScore(clusterArticles: any[]): {
  total: number,
  sourceScore: number,
  biasSpread: number,
  recency: number,
  velocity: number,
  quality: number,
  authorityBoost: number,
  phase: string
} {
  if (clusterArticles.length === 0) return { total: 0, sourceScore: 0, biasSpread: 0, recency: 0, velocity: 0, quality: 0, authorityBoost: 0, phase: "settled" };

  const now = Date.now();
  const getPubTime = (a: any) => {
    const t = a.publishedAt ? new Date(a.publishedAt).getTime() : NaN;
    return isNaN(t) ? now : t;
  };

  // 1. SOURCE SCORE (50%) - Quadratic/Log scale to reach 50 points
  const sourceCount = new Set(clusterArticles.map(a => a.sourceId)).size;

  // FIX: Ensure single-source articles score LOWER than multi-source articles.
  // sourceCount=1 -> 0 pts
  // sourceCount=2 -> 15 pts
  // sourceCount=4 -> 30 pts
  const sourceScore = Math.min(50, Math.log2(sourceCount) * 15 + (sourceCount >= 10 ? 10 : 0) + (sourceCount >= 20 ? 15 : 0));

  // 2. BIAS SPREAD (15%) - Shannon Diversity Index normalized to 15
  const sdi = calculateShannonDiversity(
    clusterArticles.reduce((acc: any, a: any) => {
      const b = a.publisher?.biasRating || "neutral";
      acc[b] = acc[b] || [];
      acc[b].push(a);
      return acc;
    }, {})
  );
  const biasSpread = (sdi / 100) * 15;

  // 3. RECENCY (35%) - Very sharp decay over 6 hours to prioritize the latest news cycle
  const firstSeenAt = Math.min(...clusterArticles.map(getPubTime));
  const ageHours = (now - firstSeenAt) / (1000 * 60 * 60);
  const recency = Math.min(35, Math.exp(-ageHours / 3) * 35);

  // BREAKING BOOST: Extra 10 points for stories less than 3 hours old
  const breakingBoost = ageHours < 3 ? 10 : 0;

  // 4. VELOCITY (10%) - Rate of new articles in last 3h
  const threeHoursAgo = now - 3 * 60 * 60 * 1000;
  const veryRecent = clusterArticles.filter(a => getPubTime(a) > threeHoursAgo).length;
  const velocity = Math.min(10, veryRecent * 2);

  // 5. QUALITY (5%) - Average quality score of top 3 articles
  const topQuality = clusterArticles
    .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
    .slice(0, 3)
    .reduce((sum, a) => sum + (a.qualityScore || 50), 0) / 3;
  const quality = (topQuality / 100) * 5;

  // 6. AUTHORITY BOOST (+10 max)
  const hasMajorSource = clusterArticles.some(a =>
    MAJOR_SOURCES.some(ms => a.publisher?.name?.toLowerCase().includes(ms))
  );
  const authorityBoost = hasMajorSource ? 10 : 0;

  let total = Math.round(sourceScore + biasSpread + recency + velocity + quality + authorityBoost + breakingBoost);

  // AGE PENALTY: Hard floor for stories older than 36h to prevent them from clogging the top
  if (ageHours > 36) total = Math.round(total * 0.6);
  if (ageHours > 72) total = Math.round(total * 0.3);

  // MULTI-SOURCE REQUIREMENT: Heavily penalize single-source articles to ensure 
  // they do not take over the homepage. We only want dense clusters.
  if (sourceCount === 1) {
    total = Math.round(total * 0.4); // 60% penalty for single-source articles
  }

  let phase = "developing";
  if (total > 80 && ageHours < 3) phase = "breaking";
  else if (total > 55) phase = "trending";
  else if (ageHours > 36) phase = "settled";

  return { total, sourceScore, biasSpread, recency, velocity, quality, authorityBoost, phase };
}

/**
 * Calculates narrative divergence within a cluster.
 * Uses TF-IDF cosine similarity between articles on opposing sides.
 * Returns 0-100 (100 = completely different stories).
 */
export function calculateNarrativeDivergence(clusterArticles: any[]): number {
  const leftArticles = clusterArticles.filter(a => (a.publisher?.biasRating || "").includes("pro_opposition"));
  const rightArticles = clusterArticles.filter(a => (a.publisher?.biasRating || "").includes("pro_establishment"));

  if (leftArticles.length === 0 || rightArticles.length === 0) return 0;

  // Compare the most representative (highest quality) article from each side
  const bestLeft = leftArticles.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))[0];
  const bestRight = rightArticles.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))[0];

  const textL = `${bestLeft.title} ${bestLeft.description || ""}`;
  const textR = `${bestRight.title} ${bestRight.description || ""}`;

  const freqL = buildTermFrequency(textL);
  const freqR = buildTermFrequency(textR);

  const similarity = cosineSimilarityFromFreq(freqL, freqR);

  // Divergence = 1 - Similarity
  return Math.round((1 - similarity) * 100);
}

export function extractTokens(text: string): Set<string> {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, "").trim();
  const words = normalized.split(/\s+/).filter(w => w.length > 3);
  const stopWords = new Set(["this", "that", "with", "from", "they", "will", "would", "could", "should", "what", "when", "where", "which", "there", "their", "have", "been", "were", "also", "into", "over", "after", "some", "them", "because", "about", "these", "only"]);
  return new Set(words.filter(w => !stopWords.has(w)));
}


export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function calculateSimilarityScore(artNew: ArticleToProcess, artExisting: ArticleContext): { score: number, reasons: any } {
  const tokensA = extractTokens(artNew.title);
  const tokensB = extractTokens(artExisting.title);
  const intersectionTokens = Array.from(tokensA).filter((t: string) => tokensB.has(t)).length;
  const unionTokens = new Set([...Array.from(tokensA), ...Array.from(tokensB)]).size;
  const titleJaccard = unionTokens > 0 ? intersectionTokens / unionTokens : 0;

  const entitiesA = extractEntities(artNew.title, artNew.description || "");
  const entitiesB = extractEntities(artExisting.title, artExisting.description || "");
  const entityJaccard = calculateWeightedEntitySimilarity(entitiesA, entitiesB);

  // Only compute expensive Levenshtein when titles already share keywords (titleJaccard > 0.5)
  // Previously ran on every pair even when they shared zero keywords — wasted O(m*n) per pair
  let fuzzyScore = 0;
  if (titleJaccard > 0.5) {
    const titleA = artNew.title.toLowerCase();
    const titleB = artExisting.title.toLowerCase();
    const editDistance = levenshteinDistance(titleA, titleB);
    const maxLen = Math.max(titleA.length, titleB.length);
    fuzzyScore = maxLen > 0 ? 1 - (editDistance / maxLen) : 0;

    if (fuzzyScore > 0.85) {
      return { score: 0.95, reasons: { fuzzyScore, titleJaccard, entityJaccard, timeScore: 1 } };
    }
  }

  let timeScore = 0.5;
  if (artNew.publishedAt && artExisting.publishedAt) {
    const tA = new Date(artNew.publishedAt).getTime();
    const tB = new Date(artExisting.publishedAt).getTime();
    if (!isNaN(tA) && !isNaN(tB)) {
      const diffHours = Math.abs(tA - tB) / (1000 * 60 * 60);
      timeScore = Math.max(0, 1 - (diffHours / 48)); // Strict 48-hour logic
    }
  }

  const SIMILARITY_THRESHOLD = 0.25; // Lowered from 0.35 for more aggressive clustering
  const CLUSTERING_TIME_WINDOW_HOURS = 120; // Increased from 72h to 120h (5 days)
  const w_t = 0.35;
  const w_ent = 0.35;
  const w_time = 0.15;
  const w_fuzzy = 0.15;

  const compositeScore = (w_t * titleJaccard) + (w_ent * entityJaccard) + (w_time * timeScore) + (w_fuzzy * fuzzyScore);

  // Vector boost if available
  let finalScore = compositeScore;
  if (artNew.embedding && artExisting.embedding) {
    try {
      const v1 = typeof artNew.embedding === 'string' ? JSON.parse(artNew.embedding) : artNew.embedding;
      const v2 = typeof artExisting.embedding === 'string' ? JSON.parse(artExisting.embedding) : artExisting.embedding;
      const cosSim = calculateCosineSimilarity(v1, v2);
      finalScore = (compositeScore * 0.4) + (cosSim * 0.6);
    } catch (e) {
      console.warn("[Similarity] Vector parse failed", e);
    }
  }

  return { score: finalScore, reasons: { titleJaccard, entityJaccard, timeScore, fuzzyScore } };
}


/**
 * Find an existing cluster for the article by:
 * 1. Keyword Jaccard overlap ≥ 35% against clusters from the last 72 hours
 * 2. Fall back to vector similarity if no keyword match found
 *
 * Returns the cluster id, or null if no match.
 */
// ─────────────────────────────────────────────────────────────────────────────
// THE LENS DISPATCH STYLE CLUSTERING
// Groups articles by TOPIC not just exact keyword match.
// Uses 3-pass approach:
// Pass 1: Named entity overlap (same people, places, organizations)
// Pass 2: Keyword Jaccard (shared topic words)
// Pass 3: Time window (published within 5 days of each other)
// An article matches a cluster if it passes ANY 2 of the 3 passes
// ─────────────────────────────────────────────────────────────────────────────

interface ClusterIndex {
  keywords: Set<string>;
  entities: EnrichedEntities;
  fingerprint: Set<string>;
  titleTokens: Set<string>;
  representatives: Array<{ title: string; embedding?: number[] | null }>;
  latestPublishedAt: number;
}

const clusterKeywordIndex = new Map<string, ClusterIndex>();
let clusterKeywordIndexBuiltAt = 0;
const CLUSTER_INDEX_TTL = 5 * 60 * 1000;
const CLUSTER_INDEX_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
// rebuild every 5 mins

async function ensureClusterIndexFresh(): Promise<void> {
  const now = Date.now();
  if (now - clusterKeywordIndexBuiltAt < CLUSTER_INDEX_TTL && clusterKeywordIndex.size > 0) return;

  // Use db directly to bypass visibilityState filter — we want ALL published articles
  // including low_priority ones so they can be clustered together
  const recentArticles = await db.select({
    id: articles.id,
    title: articles.title,
    excerpt: articles.excerpt,
    clusterId: articles.clusterId,
    publishedAt: articles.publishedAt,
    embedding: sql<number[] | null>`(SELECT ae.embedding FROM article_embeddings ae WHERE ae.article_id = ${articles.id} LIMIT 1)`,
  })
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt))
    .limit(5000); // Increased from 2000 to better support 48h-72h clustering windows

  clusterKeywordIndex.clear();
  for (const a of recentArticles) {
    if (!a.clusterId) continue;
    if (!clusterKeywordIndex.has(a.clusterId)) {
      clusterKeywordIndex.set(a.clusterId, {
        keywords: new Set(),
        entities: { persons: new Set(), organizations: new Set(), locations: new Set(), misc: new Set() },
        fingerprint: new Set(),
        titleTokens: new Set(),
        representatives: [],
        latestPublishedAt: 0
      });
    }
    const data = clusterKeywordIndex.get(a.clusterId)!;
    extractKeywords(a.title).forEach(w => data.keywords.add(w));

    const ents = extractEntities(a.title, a.excerpt || "");
    ents.persons.forEach(p => data.entities.persons.add(p));
    ents.organizations.forEach(o => data.entities.organizations.add(o));
    ents.locations.forEach(l => data.entities.locations.add(l));
    ents.misc.forEach(m => data.entities.misc.add(m));
    extractTopicFingerprint(a.title, a.excerpt || "").forEach(w => data.fingerprint.add(w));
    // Store normalised title words for containment detection
    a.title.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/)
      .filter((w: string) => w.length >= 4).forEach((w: string) => (data as any).titleTokens?.add(w));
    if (data.representatives.length < 5) {
      data.representatives.push({ title: a.title, embedding: a.embedding as any });
    }
    const pubTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    if (pubTime > data.latestPublishedAt) data.latestPublishedAt = pubTime;
  }

  clusterKeywordIndexBuiltAt = now;
}

export function addArticleToClusterIndex(clusterId: string, title: string, description: string = "", embedding?: number[] | null, publishedAt?: Date | null) {
  if (!clusterKeywordIndex.has(clusterId)) {
    clusterKeywordIndex.set(clusterId, {
      keywords: new Set(),
      entities: { persons: new Set(), organizations: new Set(), locations: new Set(), misc: new Set() },
      fingerprint: new Set(),
      titleTokens: new Set(),
      representatives: [],
      latestPublishedAt: 0
    });
  }
  const data = clusterKeywordIndex.get(clusterId)!;
  extractKeywords(title).forEach(w => data.keywords.add(w));

  const ents = extractEntities(title, description);
  ents.persons.forEach(p => data.entities.persons.add(p));
  ents.organizations.forEach(o => data.entities.organizations.add(o));
  ents.locations.forEach(l => data.entities.locations.add(l));
  ents.misc.forEach(m => data.entities.misc.add(m));
  extractTopicFingerprint(title, description).forEach(w => data.fingerprint.add(w));
  title.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/)
    .filter(w => w.length >= 4).forEach(w => data.titleTokens.add(w));
  if (data.representatives.length < 5) data.representatives.push({ title, embedding });
  const pubTime = publishedAt ? (publishedAt instanceof Date ? publishedAt.getTime() : new Date(publishedAt).getTime()) : Date.now();
  if (pubTime > data.latestPublishedAt) data.latestPublishedAt = pubTime;

  // Evict clusters older than 7 days — runs every 100 calls to avoid O(n) on every article
  if (clusterKeywordIndex.size % 100 === 0) {
    const cutoff = Date.now() - CLUSTER_INDEX_MAX_AGE_MS;
    for (const [k, v] of clusterKeywordIndex) {
      if (v.latestPublishedAt < cutoff) {
        clusterKeywordIndex.delete(k);
      }
    }
  }
}

// ─── ADVANCED TOPIC FINGERPRINT ──────────────────────────────────────────────
// Extracts a compact "story fingerprint" — the most distinctive words
// from the title weighted by rarity. Common news words are penalised.
const NEWS_NOISE = new Set([
  "says", "said", "say", "report", "reports", "new", "latest", "update",
  "breaking", "watch", "live", "news", "amid", "after", "over", "amid",
  "first", "last", "back", "year", "years", "make", "made", "time",
  "more", "most", "than", "other", "just", "like", "gets", "got",
]);

export function extractTopicFingerprint(title: string, description: string = ""): Set<string> {
  const text = `${title} ${description}`.toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 4 && !NEWS_NOISE.has(w) && !CLUSTER_STOP_WORDS.has(w));
  return new Set(text);
}

// Compute composite story-match score between 0 and 1
function computeStoryMatchScore(
  artKeywords: Set<string>,
  artEntities: EnrichedEntities,
  artFingerprint: Set<string>,
  artTitle: string,
  data: ClusterIndex
): number {
  // Signal 1: Weighted Named entity similarity (most reliable)
  const entityMatchScore = calculateWeightedEntitySimilarity(artEntities, data.entities);

  // Signal 2: Keyword Jaccard (topic word overlap)
  const kwIntersect = Array.from(artKeywords).filter(w => data.keywords.has(w)).length;
  const kwUnion = new Set([...artKeywords, ...data.keywords]).size;
  const kwScore = kwUnion > 0 ? kwIntersect / kwUnion : 0;

  // Signal 3: Topic fingerprint overlap (longer word overlap)
  let fpScore = 0;
  if (data.fingerprint && data.fingerprint.size > 0 && artFingerprint.size > 0) {
    const fpIntersect = Array.from(artFingerprint).filter(w => data.fingerprint.has(w)).length;
    const fpUnion = new Set([...artFingerprint, ...data.fingerprint]).size;
    fpScore = fpUnion > 0 ? fpIntersect / fpUnion : 0;
  }

  // Signal 4: Shingle Similarity (Internal Character-level)
  // Check against representatives for exact-lite matching
  let maxShingleSim = 0;
  for (const rep of data.representatives) {
    const sim = calculateShingleSimilarity(artTitle, rep.title);
    if (sim > maxShingleSim) maxShingleSim = sim;
  }

  // Signal 5: Title phrase containment bonus
  let containmentBonus = 0;
  if (data.titleTokens && artTitle.length > 20) {
    const artNorm = artTitle.toLowerCase().replace(/[^\w\s]/g, "");
    const artWords = new Set(artNorm.split(/\s+/).filter(w => w.length >= 4));
    const sharedTitleWords = Array.from(artWords).filter(w => data.titleTokens.has(w)).length;
    const titleJaccard = artWords.size > 0 ? sharedTitleWords / Math.max(artWords.size, data.titleTokens.size) : 0;
    if (titleJaccard >= 0.5) containmentBonus = 0.2;
  }

  // High-Confidence Shortcut: If shingle similarity > 85%, it's definitely the same story
  if (maxShingleSim > 0.85) return 0.95;

  // Weighted composite — RECALIBRATED for aggressive clustering
  // Entity (0.35) + Keyword (0.40) + Fingerprint (0.25) + Shingle (0.15) + Bonus
  // Shifted weight towards keywords/fingerprints so articles without perfect entity extraction still cluster
  const composite = (entityMatchScore * 0.35) + (kwScore * 0.40) + (fpScore * 0.25) + (maxShingleSim * 0.15) + containmentBonus;

  return Math.min(1, composite);
}

export async function findCluster(art: ArticleToProcess & { embedding?: number[] | null }): Promise<string | null> {
  const title = art.title;
  const excerpt = art.description || "";
  const words = extractKeywords(title);
  const entities = extractEntities(title, excerpt);
  const fingerprint = extractTopicFingerprint(title, excerpt);

  await ensureClusterIndexFresh();

  const SIMILARITY_THRESHOLD = 0.15; // Aggressively lowered to encourage broader clustering and rapid source accumulation
  let bestId: string | null = null;
  let bestScore = 0;

  for (const [clusterId, data] of clusterKeywordIndex) {
    // Quick filtering: Must share at least 1 keyword, 1 entity, or 3 title words to consider scoring
    const kwIntersect = Array.from(words).filter(w => data.keywords.has(w)).length;
    const hasAnyEntityMatch =
      Array.from(entities.persons).some(p => data.entities.persons.has(p)) ||
      Array.from(entities.locations).some(l => data.entities.locations.has(l)) ||
      Array.from(entities.organizations).some(o => data.entities.organizations.has(o));

    // FIX: Add title word overlap as 3rd path to bypass the early-exit filter.
    // This catches articles about the same story with different keyword framings.
    let hasTitleWordOverlap = false;
    if (data.titleTokens && data.titleTokens.size > 0) {
      const artTitleWords = title.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w: string) => w.length >= 4);
      const titleOverlap = artTitleWords.filter((w: string) => data.titleTokens.has(w)).length;
      hasTitleWordOverlap = titleOverlap >= 2; // Relaxed from 3 to 2 for better match rates on short titles
    }

    if (kwIntersect < 1 && !hasAnyEntityMatch && !hasTitleWordOverlap) continue;

    const score = computeStoryMatchScore(words, entities, fingerprint, title, data);

    if (score > bestScore) {
      bestScore = score;
      bestId = clusterId;
    }
  }

  // Final check: if bestScore is too low, we fallback to vector similarity if available
  if (bestScore < SIMILARITY_THRESHOLD && art.embedding) {
    for (const [clusterId, data] of clusterKeywordIndex) {
      if (!data.representatives) continue;

      let maxVecSim = 0;
      for (const rep of data.representatives) {
        if (!rep.embedding) continue;
        const v1 = typeof art.embedding === 'string' ? JSON.parse(art.embedding as any) : art.embedding;
        const v2 = typeof rep.embedding === 'string' ? JSON.parse(rep.embedding as any) : rep.embedding;

        try {
          const sim = calculateCosineSimilarity(v1, v2);
          if (sim > maxVecSim) maxVecSim = sim;
        } catch (e) { }
      }

      // 0.82 represents a safer broader topic match, preventing false positive merges
      if (maxVecSim >= 0.82 && maxVecSim > bestScore) {
        bestScore = maxVecSim;
        bestId = clusterId;
      }
    }
  }

  // Uses SIMILARITY_THRESHOLD (0.15). If vector match succeeded, bestScore will be >= 0.75.
  return bestScore >= SIMILARITY_THRESHOLD ? bestId : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RETROACTIVE MERGE — when a new cluster is created, look backwards through
// recent stored articles and pull in any that match this story.
// ─────────────────────────────────────────────────────────────────────────────
export async function retroactivelyMergeToCluster(
  clusterId: string,
  title: string,
  description: string,
  embeddingBy: number[],
  publishedAt: string
) {
  console.log(`[RetroactiveMerge] ⚡ Triggered background retroactive merge for new cluster ${clusterId} ("${title.substring(0, 50)}...")`);
  const clusterKeywords = extractKeywords(title);
  const clusterEntities = extractEntities(title, description);
  const clusterPubTime = new Date(publishedAt || Date.now()).getTime();

  const candidates = await db.select({
    id: articles.id,
    title: articles.title,
    excerpt: articles.excerpt,
    clusterId: articles.clusterId,
    sourceId: articles.sourceId,
    publishedAt: articles.publishedAt,
    url: articles.url,
    sourceUrl: articles.sourceUrl,
    embedding: sql<number[] | null>`ae.embedding`
  })
    .from(articles)
    .leftJoin(sql`article_embeddings ae`, sql`ae.article_id = ${articles.id}`)
    .where(and(eq(articles.status, "published"), sql`${articles.visibilityState} IN ('visible', 'low_priority')`))
    .limit(1000);

  let mergedCount = 0;
  for (const candidate of candidates) {
    if (candidate.clusterId === clusterId) continue;
    // Don't merge things from weeks ago
    const candTime = candidate.publishedAt ? new Date(candidate.publishedAt).getTime() : 0;
    if (Math.abs(clusterPubTime - candTime) > (168 * 60 * 60 * 1000)) continue;

    const candKeywords = extractKeywords(candidate.title);
    const candEntities = extractEntities(candidate.title, candidate.excerpt || "");

    const entityScore = calculateWeightedEntitySimilarity(clusterEntities, candEntities);

    const kwIntersect = Array.from(clusterKeywords).filter(w => candKeywords.has(w)).length;
    const kwUnion = new Set([...clusterKeywords, ...candKeywords]).size;
    const kwScore = kwUnion > 0 ? kwIntersect / kwUnion : 0;

    const fingerA = extractTopicFingerprint(title, description);
    const fingerB = extractTopicFingerprint(candidate.title, candidate.excerpt || "");
    const fpIntersect = Array.from(fingerA).filter(w => fingerB.has(w)).length;
    const fpUnion = new Set([...fingerA, ...fingerB]).size;
    const fpScore = fpUnion > 0 ? fpIntersect / fpUnion : 0;

    const shingleSim = calculateShingleSimilarity(title, candidate.title);

    // Advanced composite (Recalibrated for aggressive retroactive merges)
    const composite = (entityScore * 0.35) + (kwScore * 0.25) + (fpScore * 0.25) + (shingleSim * 0.20);

    let isMatch = composite >= 0.18 || shingleSim >= 0.80;

    if (!isMatch && embeddingBy && candidate.embedding) {
      try {
        const v2 = typeof candidate.embedding === 'string'
          ? JSON.parse(candidate.embedding as any)
          : candidate.embedding;
        const cosSim = calculateCosineSimilarity(embeddingBy, v2 as number[]);
        if (cosSim >= 0.82) isMatch = true;
      } catch (e) { }
    }

    if (isMatch) {
      await storage.updateArticle(candidate.id, { clusterId });
      addArticleToClusterIndex(clusterId, candidate.title, candidate.excerpt || "", candidate.embedding as any, candidate.publishedAt);
      mergedCount++;

      scheduleContentEnrichment(candidate.id, candidate.sourceUrl || candidate.url, clusterId);

      if (mergedCount >= 60) break;
    }
  }

  if (mergedCount > 0) {
    console.log(`[Cluster] Retroactive merge: pulled ${mergedCount} existing articles into ${clusterId.substring(0, 8)}`);
    await updateClusterImportance(clusterId);
  }
}

/**
 * Periodically archives/hides old clusters with low participation to maintain performance.
 */
export async function garbageCollectClusters() {
  const cutoff = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // 7 days
  console.log(`[Maintenance] Starting cluster garbage collection (older than ${cutoff.toISOString()})`);

  try {
    const oldClusters = await db.select()
      .from(clusters)
      .where(and(
        lt(clusters.firstSeenAt, cutoff),
        lte(clusters.sourceCount, 2) // Very small clusters that never gained traction
      ));

    let count = 0;
    for (const c of oldClusters) {
      // In a real system we'd archive them.
      // For now, we reduce importance so they don't trend.
      await db.update(clusters)
        .set({ importanceScore: 0 })
        .where(eq(clusters.id, c.id));
      count++;
    }

    console.log(`[Maintenance] Garbage collection complete. Archived ${count} stale clusters.`);
  } catch (e) {
    console.error("[Maintenance] Garbage collection failed:", e);
  }
}

async function scheduleContentEnrichment(articleId: string, url: string, clusterId: string) {
  // Enrichment usually happens via worker, but for retroactive merges we trigger it specifically
  try {
    const currentArt = await storage.getArticle(articleId);
    if (!currentArt) return;

    // Safely parse trace (may be stored as JSON string in DB)
    const currentTrace = typeof currentArt.trace === 'string'
      ? JSON.parse(currentArt.trace)
      : (currentArt.trace || {});

    // ⚠️ CRITICAL: Write "failed" status to DB BEFORE scraping.
    // This prevents the enrichment manager from re-queuing this article
    // on its next 2-minute cycle while scraping is still in-flight.
    let traceUpdate: Record<string, any> = { ...currentTrace, status: "failed", enriched_at: new Date().toISOString() };
    await storage.updateArticle(articleId, { trace: traceUpdate });

    const scraped = await fetchFullContent(url);
    if (scraped) {
      traceUpdate.status = "enriched";
      traceUpdate.word_count = scraped.wordCount;
      if (scraped.isPaywalled) traceUpdate.isPaywalled = true;

      await storage.updateArticle(articleId, {
        bodyHtml: scraped.isPaywalled ? (currentArt.excerpt || "") : scraped.bodyHtml,
        excerpt: scraped.excerpt || currentArt.excerpt,
        heroImageUrl: scraped.mainImage || undefined,
        wordCount: scraped.wordCount || 0,
        readabilityScore: scraped.readabilityScore ? Math.round(scraped.readabilityScore) : 50,
        entities: scraped.entities as any,
        trace: traceUpdate
      });

      // RE-SCORE article after enrichment — may upgrade from low_priority to visible
      const art = await storage.getArticle(articleId);
      if (art) {
        const pub = art.publisher || { reliabilityScore: 60, biasRating: "neutral" };
        const quality = scoreArticle(art, {
          quality: (pub as any).reliabilityScore || 60,
          biasTier: (pub as any).biasRating || "neutral"
        });
        await storage.updateArticle(articleId, {
          qualityScore: quality.score,
          visibilityState: determineVisibility(quality.score, 0)
        });
      }
    }
    // If scraped is null, the "failed" status is already committed above — no retry next cycle.
  } catch (e) {
    console.error(`[Enrichment] Failed for ${articleId}:`, e);
    try {
      const currentArt = await storage.getArticle(articleId);
      const currentTrace = typeof currentArt?.trace === 'string'
        ? JSON.parse(currentArt.trace as any)
        : (currentArt?.trace || {});
      await storage.updateArticle(articleId, {
        trace: { ...currentTrace, status: "failed" }
      });
    } catch (_) { }
  }
}


export function getFallbackImage(category: string): string {
  const fallbacks: Record<string, string> = {
    politics: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800&q=80",
    technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    business: "https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=800&q=80",
    health: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80",
    sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
    world: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=800&q=80",
  };
  return fallbacks[category] || fallbacks.politics;
}

export function lookupPublisherInfo(name: string, url: string): PublisherInfo & { domain: string } {
  let domain = "unknown";
  try {
    const rawDomain = new URL(url).hostname.toLowerCase().replace('www.', '');
    // Strip subdomains like feeds.feedburner.com or moxie.foxnews.com
    const parts = rawDomain.split('.');
    domain = parts.length > 2 ? parts.slice(-2).join('.') : rawDomain;
  } catch (e) { }

  // Name overrides for feedburners that hide the real URL
  const n = name ? name.toLowerCase() : "";
  if (n.includes("breitbart")) domain = "breitbart.com";
  if (n.includes("fox news")) domain = "foxnews.com";
  if (n.includes("washington times")) domain = "washingtontimes.com";
  if (n.includes("daily wire")) domain = "dailywire.com";

  const dbInfo = PUBLISHER_BIAS_DB[domain];
  if (dbInfo) return { ...dbInfo, domain };

  // Fallback if not in DB
  // Default to Tier 1 metadata
  return {
    bias: "neutral", // Default bias
    factuality: "very_high",
    ownerName: name || domain,
    ownerType: "unknown",
    domain: domain
  };
}


export async function processArticle(
  art: ArticleToProcess,
  catMap: Record<string, string>,
  systemUserId: string
): Promise<string | null> {
  if (!art.title || art.title === "[Removed]") return null;

  // MOVE DUPLICATE CHECK TO TOP — skip all work if article already exists
  // Hash only URL so stealth headline edits do not cause DB constraint violations
  const articleId = crypto.createHash('md5').update(art.url).digest('hex');
  const existingCheck = await storage.getArticle(articleId);
  if (existingCheck) return null;

  // Correction detector — if title contains correction/retraction keywords,
  // find the original story and flag it
  const correctionKeywords = /\b(correction|retraction|corrected|retracted|clarification|update:|editor'?s? note)\b/i;
  if (correctionKeywords.test(art.title)) {
    // Try to find related cluster to flag
    const artEmbeddingForCorrection = generateEmbedding(`${art.title} ${art.description || ""}`);
    const relatedCluster = await findCluster({ ...art, embedding: artEmbeddingForCorrection });
    if (relatedCluster) {
      await storage.updateCluster(relatedCluster, {
        hasCorrection: true,
        correctionNote: `Correction issued by ${art.source.name}: "${art.title}"`,
      } as any);
      console.log(`[Correction] Flagged cluster ${relatedCluster.substring(0, 8)} — "${art.title}"`);
    }
    // Don't process correction articles as regular articles
    return null;
  }

  // 7-DAY DATE FILTER — Skip articles older than 7 days
  if (art.publishedAt) {
    const pubDate = new Date(art.publishedAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (pubDate < sevenDaysAgo) {
      console.log(`[Processing] Skipping stale article (older than 7d): ${art.title}`);
      return null;
    }
  }

  const url = art.url;
  const domain = art.domain || (new URL(url).hostname.toLowerCase().replace('www.', ''));
  const realSourceName = art.source.name;
  const realSourceUrl = art.source.url || url;

  const pubInfo = lookupPublisherInfo(realSourceName, realSourceUrl);
  const pubSlug = slugify(realSourceName);

  // Use indexed slug lookup instead of listPublishers().find()
  let publisher = await storage.getPublisherBySlug(pubSlug);
  if (!publisher) {
    publisher = await storage.createPublisher({
      name: realSourceName,
      slug: pubSlug,
      description: `News source: ${realSourceName}`,
      logoUrl: null,
      website: realSourceUrl || null,
      biasRating: pubInfo.bias,
      factualityRating: pubInfo.factuality,
      ownerName: pubInfo.ownerName,
      ownerType: pubInfo.ownerType,
      country: "US",
      language: "en",
      reliabilityScore: (pubInfo as any).reliabilityScore || 60,
    });
  }

  const categorySlug = guessCategory(art.title, art.description);
  const categoryId = catMap[categorySlug] || catMap["politics"];

  // Generate Jina embedding BEFORE cluster matching
  let articleEmbedding: number[] | null = null;
  if (art.embedding) {
    articleEmbedding = typeof art.embedding === 'string'
      ? JSON.parse(art.embedding as string)
      : art.embedding as number[];
  } else {
    try {
      const { getEmbedding } = await import("./lib/embeddings-client");
      articleEmbedding = await getEmbedding(`${art.title} ${art.description || ""}`);
      if (articleEmbedding) {
        art.embedding = articleEmbedding;
      }
    } catch (err: any) {
      console.warn("[Processing] Sync Jina embedding failed, using local hash:", err.message);
    }
  }

  // Fallback to local sparse hash if Jina failed or is rate-limited
  const finalEmbedding = articleEmbedding || generateEmbedding(`${art.title} ${art.description || ""}`);

  const clusterId = await findCluster({ ...art, embedding: finalEmbedding });
  // articleId and duplicate check already done at top of function
  const trace: Record<string, any> = art.trace || { fetched: new Date().toISOString() };

  // TIERED ENRICHMENT: Skip active scraping during initial ingestion.
  // Full content will be fetched later by the Enrichment Manager for top stories.
  let fullContent = `<p>${art.description || ""}</p><p>${art.content || ""}</p><p><a href="${art.url}" target="_blank" rel="noopener">Read full article at ${art.source.name} →</a></p>`;
  let excerpt = art.description || art.title;
  let heroImage: string | null = art.image || getFallbackImage(categorySlug);

  // Scraper is skipped here to ensure fast ingestion of hundreds of articles.
  // We only track the fact that it hasn't been enriched yet.
  trace.tiered_ingestion = new Date().toISOString();
  trace.status = "metadata_only";

  // Reject Google generic thumbnails
  if (heroImage && (heroImage.includes('lh3.googleusercontent.com') || heroImage.includes('googleusercontent.com'))) {
    heroImage = null;
  }

  // Use category-based fallback if no real image found
  if (!heroImage) {
    heroImage = getFallbackImage(categorySlug);
  }

  trace.validated = new Date().toISOString();

  const articleSlug = slugify(art.title) + "-" + Date.now().toString(36);

  let finalClusterId = clusterId;
  if (!finalClusterId) {
    const newCluster = await storage.createCluster({
      headline: art.title,
      summary: art.description || "",
      sourceCount: 1,
      // --- Editorial Intelligence 2.0: Track Origin ---
      originPublisherId: publisher.id,
      originPublishedAt: art.publishedAt ? new Date(art.publishedAt) : new Date(),
    });
    finalClusterId = newCluster.id;
    trace.clustered_new = new Date().toISOString();
    recordClusterEvent({ type: "new", clusterId: newCluster.id, title: art.title });

    const { retroactiveMergeQueue } = await import("./queue");
    retroactiveMergeQueue.add("merge", {
      clusterId: finalClusterId,
      title: art.title,
      description: art.description || "",
      embedding: articleEmbedding as number[],
      publishedAt: art.publishedAt
    }).catch(() => { });

  } else {
    console.log(`🔗 [CLUSTER] Cluster matched: ${art.title}`);
    trace.clustered_existing = new Date().toISOString();
  }

  const quality = scoreArticle({ title: art.title, description: art.description, excerpt: excerpt, publishedAt: art.publishedAt }, {
    quality: publisher.reliabilityScore || 60,
    biasTier: pubInfo.bias
  });
  const qualityScore = quality.score;
  const visibility = determineVisibility(qualityScore, 0);

  trace.quality_scored = new Date().toISOString();
  trace.quality_history = quality.flags;
  trace.quality_score = qualityScore;
  trace.visibility = visibility;
  trace.quality_approved = quality.approved;

  // Derive numeric biasScore from publisher's bias label so every article has real data
  const biasScore = biasLabelToScore(pubInfo.bias);

  let created;
  try {
    created = await storage.createArticle({
      id: articleId,
      sourceId: publisher.id,
      clusterId: finalClusterId,
      title: art.title,
      slug: articleSlug,
      excerpt: excerpt,
      bodyClean: excerpt,
      bodyHtml: fullContent,
      fullContent: fullContent,
      heroImageUrl: heroImage,
      url: art.url,
      sourceUrl: art.url,
      domain: pubInfo.domain,
      trace: trace,
      status: "published",
      visibilityState: visibility,
      qualityScore: qualityScore,
      importanceScore: 0,
      biasScore: biasScore,
      publishedAt: art.publishedAt ? new Date(art.publishedAt) : new Date(),
    }, [], []);  // categoryIds and tagIds resolved by the fetcher after creation
  } catch (err: any) {
    if (err.code === '23505') return null; // duplicate article — skip silently
    throw err;
  }

  // Update cluster index immediately so next article finds it without a DB call
  addArticleToClusterIndex(finalClusterId!, art.title, art.description || "", articleEmbedding);

  // E5 embedding — fire and forget, non-blocking
  embeddingService.embedArticle({
    id: created.id,
    title: created.title,
    excerpt: created.excerpt,
    embedding: articleEmbedding
  }).catch(() => { });

  // Score immediately — new articles appear in quality-filtered homepage right away
  // Fire and forget — never block article processing
  updateClusterImportance(finalClusterId!).catch(() => { });

  return created.clusterId;
}

export async function generateSmartSummary(clusterId: string) {
  const { articles: articlesInGroup } = await storage.listArticles({ clusterId, status: "published" });
  if (articlesInGroup.length < 2) return;

  // EFFICIENCY GUARD: Only re-summarize if a cluster grows significantly.
  // This saves AI credits/CPU while articles from 20+ sources are still arriving.
  const existingCluster = await storage.getCluster(clusterId);
  const currentCount = articlesInGroup.length;
  const lastCount = (existingCluster as any)?.sourceCount || 0;

  const lastSummary = (existingCluster as any)?.summaryUpdatedAt || (existingCluster as any)?.updatedAt;

  if (existingCluster?.summary) {
    const sourceGrowth = lastCount > 0 ? currentCount / lastCount : currentCount;
    if (sourceGrowth < 1.5 && currentCount < 15) {
      console.log(`[Summary] Cluster ${clusterId} still small/stable (${currentCount} sources) — skipping re-summary`);
      return;
    }
  }

  // Additional freshness guard: if summarized in last 10 min, skip to prevent simultaneous bursts
  if (lastSummary) {
    const age = Date.now() - new Date(lastSummary).getTime();
    if (age < 10 * 60 * 1000) {
      console.log(`[Summary] Cluster ${clusterId} was summarized < 10 mins ago — skipping Groq to prevent duplicate bursts.`);
      return;
    }
  }

  // Try to generate AI summary using Groq
  try {
    const { summarizeClusterWithGroq } = await import("./lib/groq-summarizer");
    const aiSummaryResult = await summarizeClusterWithGroq(articlesInGroup);
    if (aiSummaryResult) {
      await storage.updateCluster(clusterId, {
        summary: aiSummaryResult.summary,
        aiSummary: aiSummaryResult.aiSummary,
        aiFramingDiff: aiSummaryResult.aiFramingDiff,
        aiForeignGaze: aiSummaryResult.aiForeignGaze,
        aiMarketTickers: aiSummaryResult.aiMarketTickers,
        aiEntityQuotes: aiSummaryResult.aiEntityQuotes,
        aiExecutiveBriefing: aiSummaryResult.aiExecutiveBriefing,
        aiEnrichedAt: new Date()
      } as any);
      console.log(`[Summary] Successfully generated Groq AI summary and advanced features for cluster ${clusterId}`);
      return;
    }
  } catch (err: any) {
    console.error(`[Summary] Groq summarization failed for cluster ${clusterId}:`, err.message);
  }

  // Fallback sentence-extraction for low-importance clusters FLAN skips
  const candidateSentences: { text: string, bias: string }[] = [];
  articlesInGroup.forEach((art: any) => {
    const text = `${art.title}. ${art.bodyClean || ""}`;
    const parts = text.split(/[.!?]\s+/);
    parts.forEach((p: string) => {
      const clean = p.trim().replace(/^["']|["']$/g, "");
      if (clean.length > 50 && clean.length < 200) {
        candidateSentences.push({ text: clean, bias: art.bias || art.source?.biasRating || "neutral" });
      }
    });
  });

  const finalInsights: string[] = [];
  const pool = candidateSentences.sort((a, b) => b.text.length - a.text.length);
  for (const s of pool) {
    if (finalInsights.length >= 5) break;
    if (!finalInsights.some(existing => existing.includes(s.text.substring(0, 20)))) {
      finalInsights.push(s.text);
    }
  }

  if (finalInsights.length > 0) {
    await storage.updateCluster(clusterId, {
      summary: finalInsights.slice(0, 3).join(" ")
    });
  }
}

export async function updateClusterImportance(clusterId: string) {
  const existingCluster = await storage.getCluster(clusterId);
  const { articles: articlesInGroup } = await storage.listArticles({ clusterId, status: "published" });
  if (articlesInGroup.length === 0) return;

  // EFFICIENCY GUARD: If updated in last 5 mins and no major change, skip
  // CRITICAL FIX: Do NOT skip if the cluster was just created (lastSourceCount === 0)
  // CRITICAL FIX 2: We MUST update if the source count changes by even 1, 
  // otherwise the frontend will be stuck showing "1 SOURCES" indefinitely.
  if (existingCluster?.lastUpdatedAt) {
    const lastUpdate = new Date(existingCluster.lastUpdatedAt).getTime();
    const sourceCount = new Set(articlesInGroup.map((a: any) => a.sourceId).filter(Boolean)).size;
    const lastSourceCount = (existingCluster as any).sourceCount || 0;

    const timeSinceUpdate = Date.now() - lastUpdate;
    // Only skip if the source count is EXACTLY the same, to ensure UI is accurate
    if (lastSourceCount > 0 && timeSinceUpdate < 5 * 60 * 1000 && sourceCount === lastSourceCount) {
      return;
    }
  }

  const uniquePublishers = new Set(articlesInGroup.map((a: any) => a.sourceId).filter(Boolean));
  let proEstablishmentCount = 0, proOppositionCount = 0, regionalAlignedCount = 0, neutralCount = 0;
  articlesInGroup.forEach((a: any) => {
    const bias = a.publisher?.biasRating || "neutral";
    if (bias === "pro_establishment") proEstablishmentCount++;
    else if (bias === "pro_opposition") proOppositionCount++;
    else if (bias === "regional_aligned") regionalAlignedCount++;
    else neutralCount++;
  });

  const importanceData = calculateMasterImportanceScore(articlesInGroup);
  const importanceScore = importanceData.total;

  // Blindspot Detection
  // A cluster is a blindspot if one side heavily covers it (>=3) and the opposite covers it 0 times.
  let blindspotScore = 0;
  let blindspotSide: string | null = null;
  
  if (proEstablishmentCount >= 3 && proOppositionCount === 0) {
    blindspotScore = 80;
    blindspotSide = "pro_opposition"; // The side ignoring the story
  } else if (proOppositionCount >= 3 && proEstablishmentCount === 0) {
    blindspotScore = 80;
    blindspotSide = "pro_establishment"; // The side ignoring the story
  } else if (regionalAlignedCount >= 3 && proEstablishmentCount === 0 && proOppositionCount === 0) {
    blindspotScore = 60;
    blindspotSide = "national_media";
  }

  // ── Sync back to Cluster table ──────────────────────────────────────────────
  await storage.updateCluster(clusterId, {
    importanceScore,
    sourceCount: uniquePublishers.size,
    proEstablishmentCount,
    proOppositionCount,
    regionalAlignedCount,
    neutralCount,
    blindspotScore,
    blindspotSide,
    lastUpdatedAt: new Date(),
    trendingScore: importanceData.total,
    storyPhase: importanceData.phase
  } as any);

  // Batch update all articles' importanceScore in one SQL
  try {
    await db.update(articles)
      .set({ importanceScore })
      .where(eq(articles.clusterId, clusterId));
  } catch {
    for (const art of articlesInGroup) {
      if (art.importanceScore !== importanceScore) {
        await storage.updateArticle(art.id, { importanceScore });
      }
    }
  }

  console.log(`[Importance] ${clusterId.substring(0, 8)}: score=${importanceScore} phase=${importanceData.phase}`);

  // Invalidate homepage cache AFTER DB is updated to prevent race conditions
  import("./cache").then(({ cache: c }) =>
    c.delete("homepage_clusters_final").catch(() => { })
  ).catch(() => { });
  import("./queue").then(({ connection }) =>
    connection.del("homepage:v1").catch(() => { })
  ).catch(() => { });
}

// ─── NARRATIVE DRIFT DETECTOR ────────────────────────────────────────────────
// Measures sentiment/sensationalism delta between an article and its cluster.

const SENSATIONAL_WORDS = new Set([
  "shocking", "brutal", "horrific", "unbelievable", "unprecedented", "devastating",
  "miraculous", "outrageous", "terrifying", "scandalous", "bombshell", "epic"
]);

function calculateSentimentBias(text: string): number {
  const words = text.toLowerCase().split(/\W+/);
  let score = 0;
  for (const w of words) {
    if (SENSATIONAL_WORDS.has(w)) score += 25;
  }
  // Clamp 0-100
  return Math.min(100, score);
}

export async function calculateNarrativeDrift(articleId: string, clusterId: string): Promise<number> {
  const article = await storage.getArticle(articleId);
  if (!article) return 0;

  const { articles: peers } = await storage.listArticles({ clusterId, status: "published" });
  if (peers.length < 2) return 0;

  const artBias = calculateSentimentBias(article.title);
  const peerBiases = peers.map((p: any) => calculateSentimentBias(p.title));
  const meanBias = peerBiases.reduce((a: number, b: number) => a + b, 0) / peerBiases.length;

  // Drift is the absolute deviation from the mean
  const drift = Math.abs(artBias - meanBias);

  // Optionally update article status or metadata
  await storage.updateArticle(articleId, {
    narrativeDrift: Math.round(drift)
  } as any);

  return drift;
}

export async function computeClusterDivergence(clusterId: string): Promise<number> {
  const { articles: arts } = await storage.listArticles({ clusterId, status: "published" });
  if (arts.length < 2) return 0;

  const vectors = arts.map((a: any) => buildTFIDF(`${a.title} ${a.excerpt || ""}`));

  const sims: number[] = [];
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      sims.push(calculateCosineSimilarity(vectors[i], vectors[j]));
    }
  }

  const meanSim = sims.reduce((s: number, v: number) => s + v, 0) / sims.length;
  // divergence = 1 - similarity, scaled 0-100
  return Math.round((1 - meanSim) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// STORY CONFIDENCE SIGNAL
// improvment.md: confidence = mean_pairwise_similarity × mean_factuality × log(sourceCount+1) / 3
// > 70 → "Confirmed"   0.4-0.7 → "Developing"   < 40 → "Disputed"
// ─────────────────────────────────────────────────────────────────────────────

const FACTUALITY_SCORES: Record<string, number> = {
  very_high: 1.0, high: 0.8, mixed: 0.5, low: 0.3, very_low: 0.1
};

export async function computeConfidenceSignal(clusterId: string): Promise<{
  confidenceScore: number;
  narrativeLabel: "confirmed" | "developing" | "disputed";
}> {
  const { articles: arts } = await storage.listArticles({ clusterId, status: "published" });
  if (arts.length === 0) return { confidenceScore: 50, narrativeLabel: "developing" };

  // Mean pairwise similarity
  const freqs = arts.map((a: any) => buildTermFrequency(`${a.title} ${a.excerpt || ""}`));
  const sims: number[] = [];
  for (let i = 0; i < freqs.length; i++) {
    for (let j = i + 1; j < freqs.length; j++) {
      sims.push(cosineSimilarityFromFreq(freqs[i], freqs[j]));
    }
  }
  const meanSim = sims.length > 0 ? sims.reduce((s: number, v: number) => s + v, 0) / sims.length : 0.5;

  // Mean factuality from publishers
  const factScores = arts.map((a: any) => {
    const f = (a.publisher as any)?.factualityRating as string | undefined;
    return FACTUALITY_SCORES[f || ""] || 0.6;
  });
  const meanFactuality = factScores.reduce((s: number, v: number) => s + v, 0) / factScores.length;

  // log(sourceCount + 1) normalized over expected max of log(11) ≈ 2.4
  const logSources = Math.log(arts.length + 1) / Math.log(11);

  const rawConfidence = (meanSim + meanFactuality + logSources) / 3;
  const confidenceScore = Math.round(rawConfidence * 100);

  let narrativeLabel: "confirmed" | "developing" | "disputed";
  if (confidenceScore >= 70) narrativeLabel = "confirmed";
  else if (confidenceScore >= 40) narrativeLabel = "developing";
  else narrativeLabel = "disputed";

  return { confidenceScore, narrativeLabel };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRENDING & BLINDSPOT ALGORITHMS (Phase 3)
// ─────────────────────────────────────────────────────────────────────────────

export async function computeTrendingScore(clusterId: string): Promise<number> {
  const cluster = await storage.getCluster(clusterId);
  if (!cluster || cluster.sourceCount < 3) return 0;

  // Age gating: trending must be fresh (< 12h for flexibility, ideally < 6h)
  const ageHours = (Date.now() - new Date(cluster.firstSeenAt).getTime()) / (1000 * 60 * 60);
  if (ageHours > 12) return 0;

  // trending_score = velocity_score × 0.6 + (sourceCount per hour) × 4
  const velocityScore = cluster.velocityScore || 0;
  // velocityScore is (sources_last_2h / total) * 100. 
  // Let's use a more direct growth rate:
  const sourcesLast2h = (velocityScore / 100) * cluster.sourceCount;
  const growthRate = sourcesLast2h / 2; // sources per hour

  const trendingScore = Math.round((velocityScore * 0.6) + (growthRate * 20));
  return Math.min(trendingScore, 100);
}

export async function computeBlindspotScore(clusterId: string): Promise<number> {
  const cluster = await storage.getCluster(clusterId);
  if (!cluster || cluster.sourceCount < 3) return 0;

  const counts = [
    { name: "pro_establishment", count: cluster.proEstablishmentCount },
    { name: "pro_opposition", count: cluster.proOppositionCount },
    { name: "regional_aligned", count: cluster.regionalAlignedCount },
    { name: "neutral", count: cluster.neutralCount }
  ];
  
  const max = Math.max(...counts.map(c => c.count));
  const min = Math.min(...counts.map(c => c.count));

  // If a bucket is missing (min = 0) while another is well-covered (max >= 2)
  const isSignificant = min === 0 && max >= 2;
  return isSignificant ? 100 : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER UPDATE — runs divergence + confidence + importance in one pass
// Called by the 15-minute scheduler
// ─────────────────────────────────────────────────────────────────────────────
export async function updateClusterAnalytics(clusterId: string) {
  try {
    await updateClusterImportance(clusterId);
    const divergenceScore = await computeClusterDivergence(clusterId);
    const { confidenceScore, narrativeLabel } = await computeConfidenceSignal(clusterId);

    // Quality Signal (Phase 2)
    const qualityData = await updateClusterQuality(clusterId);

    // Narrative Drift (Module 4) - Calculate variance in sentiment/reporting
    let narrativeDrift = await calculateClusterNarrativeDrift(clusterId);
    if (isNaN(narrativeDrift)) narrativeDrift = 0;

    const { articles: artsInGroup } = await storage.listArticles({ clusterId, status: "published" });
    if (artsInGroup.length === 0) return;

    const importanceData = calculateMasterImportanceScore(artsInGroup);
    let trendingScore = Math.round(importanceData.total);
    if (isNaN(trendingScore)) trendingScore = 0;

    // --- Editorial Intelligence 2.0: Aggregates ---
    const blindspotData = fillCluster(artsInGroup);
    const shannonDiversity = Math.round(blindspotData.shannonDiversity);

    // Compute Geography
    const geographyAggs: Record<string, number> = {};
    artsInGroup.forEach((a: any) => {
      const country = a.publisher?.country || "US";
      geographyAggs[country] = (geographyAggs[country] || 0) + 1;
    });

    await storage.updateCluster(clusterId, {
      divergenceScore,
      confidenceScore,
      narrativeLabel,
      qualityScore: qualityData.qualityScore,
      hasCorrection: qualityData.hasCorrection,
      correctionNote: qualityData.correctionNote,
      narrativeDrift: Math.round(narrativeDrift * 100),
      trendingScore,
      blindspotScore: blindspotData.isBlindspot ? 85 : 0,
      blindspotSide: blindspotData.blindspotSide,
      storyPhase: importanceData.phase || "developing",
      // New Intelligence Fields
      shannonDiversity,
      geographyAggs,
    } as any);

    if (divergenceScore > 60) {
      console.log(`[Divergence] ${clusterId.substring(0, 8)}: HIGH DISAGREEMENT (${divergenceScore}) → ${narrativeLabel}`);
    }
  } catch (err) {
    console.error(`[Analytics] Error updating cluster ${clusterId}:`, err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUALITY ENGINE
// Evaluates individual articles and aggregates to cluster quality.
// ─────────────────────────────────────────────────────────────────────────────

interface QualityResult {
  qualityScore: number;
  hasCorrection: boolean;
  correctionNote: string | null;
}

const CLICKBAIT_PATTERNS = [
  /\b(you (won't|will never) believe|this (one|simple) trick|doctors hate (him|her)|scientists found|shocking truth|is (he|she|this) real)\b/i,
  /\?{2,}/, // Double question marks
  /!{2,}/, // Double exclamation marks
  /\b(amazing|unbelievable|astonishing|horrifying|insane)\b/i
];

export async function computeArticleQuality(articleId: string): Promise<number> {
  const art = await storage.getArticle(articleId);
  if (!art) return 50;

  let score = 70; // Base score

  // 1. Clickbait Headline Detection (-20)
  const isClickbait = CLICKBAIT_PATTERNS.some(p => p.test(art.title));
  if (isClickbait) score -= 25;

  // 2. Word Count Analysis (Low substance = -15)
  const wordCount = (art.bodyHtml || art.excerpt || "").split(/\s+/).length;
  if (wordCount < 100) score -= 15;
  else if (wordCount > 500) score += 10;

  // 3. Publisher Factuality Multiplier
  const fact = (art.publisher as any)?.factualityRating as string | undefined;
  const multi = FACTUALITY_SCORES[fact || ""] || 0.8;

  return Math.max(0, Math.min(100, Math.round(score * multi)));
}

export async function updateClusterQuality(clusterId: string): Promise<QualityResult> {
  const { articles: arts } = await storage.listArticles({ clusterId, status: "published" });
  if (arts.length === 0) return { qualityScore: 50, hasCorrection: false, correctionNote: null };

  const scores: number[] = [];
  let hasCorrection = false;
  let correctionNote: string | null = null;

  for (const art of arts) {
    const q = await computeArticleQuality(art.id);
    scores.push(q);

    // Correction Detection
    const text = (art.title + " " + (art.excerpt || "")).toLowerCase();
    if (text.includes("correction:") || text.includes("retraction:") || text.includes("updated story:")) {
      hasCorrection = true;
      correctionNote = `Correction detected in coverage from ${art.publisher?.name || 'source'}`;
    }
  }

  const avgQuality = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  return { qualityScore: avgQuality, hasCorrection, correctionNote };
}

// ─────────────────────────────────────────────────────────────────────────────
// VELOCITY + PHASE ENGINE
// Runs every 5 minutes. Computes how fast each story is gaining sources.
// velocity_score = sources added in last 2h / total sources (0-100)
// story_phase = breaking / developing / analysis / settled (pure rule-based)
// ─────────────────────────────────────────────────────────────────────────────
export async function updateClusterVelocity(clusterId: string) {
  const now = Date.now();
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

  const recentResult = await db
    .select({
      recentCount: sql<number>`COUNT(*) FILTER (WHERE ${articles.fetchedAt} > ${twoHoursAgo})`,
      totalCount: sql<number>`COUNT(*)`,
      firstSeen: sql<Date>`MIN(${articles.fetchedAt})`,
      lastSeen: sql<Date>`MAX(${articles.fetchedAt})`,
    })
    .from(articles)
    .where(and(
      eq(articles.clusterId, clusterId),
      eq(articles.status, "published"),
    ));

  const row = recentResult[0] as any;
  const recentCount = Number(row?.recentCount) || 0;
  const totalCount = Number(row?.totalCount) || 1;
  const firstSeen = row?.firstSeen ? new Date(row.firstSeen) : new Date();

  // Velocity: 0-100 scale
  const rawVelocity = recentCount / totalCount;
  const velocityScore = Math.round(rawVelocity * 100);

  // Age of the story in hours
  const ageHours = (now - firstSeen.getTime()) / (1000 * 60 * 60);

  // Story phase — pure rule-based, no LLM
  let storyPhase: "breaking" | "developing" | "analysis" | "settled";
  if (ageHours < 4 && totalCount >= 2 && velocityScore >= 40) {
    storyPhase = "breaking";
  } else if (ageHours < 24 && velocityScore >= 15) {
    storyPhase = "developing";
  } else if (ageHours < 72 && velocityScore < 15) {
    storyPhase = "analysis";
  } else {
    storyPhase = "settled";
  }

  await storage.updateCluster(clusterId, {
    velocityScore,
    storyPhase,
  } as any);

  if (velocityScore > 30) {
    console.log(`[Velocity] ${clusterId.substring(0, 8)}: velocity=${velocityScore} phase=${storyPhase} age=${Math.round(ageHours)}h`);
  }

  return { velocityScore, storyPhase };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLISHER UNIQUENESS SCORER
// For each publisher, compare today's articles to all other publishers'
// articles in the same clusters. Low similarity = original reporting.
// High similarity = rewriting someone else's story.
// Runs daily. Updates publishers.uniquenessScore (0-100).
// ─────────────────────────────────────────────────────────────────────────────

// Simple TF-IDF word frequency builder
function buildTermFrequency(text: string): Map<string, number> {
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3);

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  return freq;
}

function cosineSimilarityFromFreq(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, magA = 0, magB = 0;
  for (const [word, countA] of a) {
    magA += countA * countA;
    const countB = b.get(word) || 0;
    dot += countA * countB;
  }
  for (const [, countB] of b) {
    magB += countB * countB;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Calculates narrative drift for a cluster based on sentiment variance and entity disagreement.
 * High drift indicates conflicting reporting or rapidly changing facts.
 */
async function calculateClusterNarrativeDrift(clusterId: string): Promise<number> {
  const { articles: arts } = await storage.listArticles({ clusterId, status: "published" });
  if (arts.length <= 2) return 0.1; // Baseline drift for low-source stories

  // Simple drift: Variance in article sentiment as a proxy for conflicting narratives.
  const sentiments = (arts as any[]).map((a: any) => {
    const text = (a.title + " " + (a.excerpt || "")).toLowerCase();
    // Very basic sentiment heuristic for drift
    if (text.includes("disaster") || text.includes("crisis") || text.includes("error") || text.includes("tragedy")) return -1;
    if (text.includes("success") || text.includes("breakthrough") || text.includes("win") || text.includes("victory")) return 1;
    return 0;
  });

  const avgSentiment = sentiments.reduce((a: number, b: number) => a + b, 0) / sentiments.length;
  const variance = sentiments.reduce((a: number, b: number) => a + Math.pow(b - avgSentiment, 2), 0) / sentiments.length;

  // Max variance for [-1, 0, 1] is around 1.0 (e.g. half -1, half 1)
  return Math.min(1.0, variance);
}

export async function updatePublisherUniqueness(publisherId: string) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get this publisher's articles from last 24h with their cluster
  const pubArticles = await db.select({
    id: articles.id,
    title: articles.title,
    excerpt: articles.excerpt,
    clusterId: articles.clusterId,
  })
    .from(articles)
    .where(and(
      eq(articles.sourceId, publisherId),
      gte(articles.fetchedAt, oneDayAgo),
      eq(articles.status, "published")
    ))
    .limit(30);

  if (pubArticles.length === 0) return;

  const clusterIds = pubArticles
    .map((a: any) => a.clusterId)
    .filter(Boolean) as string[];

  if (clusterIds.length === 0) {
    // No clusters = all articles are solo = high uniqueness
    await db.update(publishers)
      .set({ uniquenessScore: 80, lastReliabilityUpdate: new Date() })
      .where(eq(publishers.id, publisherId));
    return;
  }

  // Get other publishers' articles in same clusters
  const otherArticles = await db.select({
    id: articles.id,
    title: articles.title,
    excerpt: articles.excerpt,
    clusterId: articles.clusterId,
    sourceId: articles.sourceId,
    entities: articles.entities, // Include entities for originality check
  })
    .from(articles)
    .where(and(
      inArray(articles.clusterId, clusterIds),
      sql`${articles.sourceId} != ${publisherId}`,
      eq(articles.status, "published"),
      gte(articles.fetchedAt, oneDayAgo)
    ))
    .limit(200);

  if (otherArticles.length === 0) {
    // Only publisher covering these stories = highly original
    await db.update(publishers)
      .set({ uniquenessScore: 90, lastReliabilityUpdate: new Date() })
      .where(eq(publishers.id, publisherId));
    return;
  }

  // Build term frequency vectors for each article
  const pubVectors = pubArticles.map((a: any) => ({
    clusterId: a.clusterId,
    vec: buildTermFrequency(`${a.title} ${a.excerpt || ""}`)
  }));

  const otherVectors = otherArticles.map((a: any) => ({
    clusterId: a.clusterId,
    vec: buildTermFrequency(`${a.title} ${a.excerpt || ""}`)
  }));

  // For each publisher article, find max similarity to any other publisher
  const uniquenessMetrics: { sim: number, exclusiveEntities: number }[] = [];

  for (const pubArt of pubArticles) {
    const pubVec = buildTermFrequency(`${pubArt.title} ${pubArt.excerpt || ""}`);
    const sameClusterOthers = otherArticles.filter((o: any) => o.clusterId === pubArt.clusterId);

    if (sameClusterOthers.length === 0) {
      uniquenessMetrics.push({ sim: 0, exclusiveEntities: 3 }); // High baseline if solo
      continue;
    }

    // 1. Text Similarity (Cosine)
    const maxSim = Math.max(...sameClusterOthers.map((o: any) => {
      const oVec = buildTermFrequency(`${o.title} ${o.excerpt || ""}`);
      return cosineSimilarityFromFreq(pubVec, oVec);
    }));

    // 2. Exclusive Entity Detection
    // Entities that THIS article has but NO other article in the cluster has
    const pubEnts = new Set([
      ...((pubArt as any).entities?.persons || []),
      ...((pubArt as any).entities?.organizations || []),
      ...((pubArt as any).entities?.locations || [])
    ]);

    const otherEntsInCluster = new Set();
    sameClusterOthers.forEach((o: any) => {
      const ents = (o.entities as any) || {};
      (ents.persons || []).forEach((e: string) => otherEntsInCluster.add(e));
      (ents.organizations || []).forEach((e: string) => otherEntsInCluster.add(e));
      (ents.locations || []).forEach((e: string) => otherEntsInCluster.add(e));
    });

    const exclusive = Array.from(pubEnts).filter(e => !otherEntsInCluster.has(e)).length;
    uniquenessMetrics.push({ sim: maxSim, exclusiveEntities: exclusive });
  }

  // Final Uniqueness = (1 - avgMaxSim) * 70 + (exclusiveBoost) * 30
  const avgMaxSim = uniquenessMetrics.reduce((a: number, b: any) => a + b.sim, 0) / uniquenessMetrics.length;
  const avgExclusive = uniquenessMetrics.reduce((a: number, b: any) => a + b.exclusiveEntities, 0) / uniquenessMetrics.length;

  // Normalize exclusive boost: 1 exclusive entity = 10 points, max 30
  const exclusiveBoost = Math.min(30, avgExclusive * 10);
  const textUniqueness = (1 - avgMaxSim) * 70;

  const uniquenessScore = Math.round(textUniqueness + exclusiveBoost);

  await db.update(publishers)
    .set({
      uniquenessScore: Math.max(0, Math.min(100, uniquenessScore)),
      lastReliabilityUpdate: new Date()
    })
    .where(eq(publishers.id, publisherId));

  console.log(`[Uniqueness] ${publisherId.substring(0, 8)}: score=${uniquenessScore} (avg_sim=${avgMaxSim.toFixed(2)})`);
}

// ─── TIERED ENRICHMENT MANAGER ──────────────────────────────────────────────

/**
 * Identifies "hot" stories (clusters with many sources or high importance)
 * and queues their articles for full content scraping.
 */
export async function runEnrichmentManager() {
  console.log("[Enrichment] Running manager pass...");
  try {
    const allClusters = await storage.listClusters();
    // Only enrich clusters that have at least 3 sources or high importance
    const hotClusters = allClusters
      .filter((c: any) => (c.sourceCount >= 3 || (c as any).importanceScore > 60))
      .sort((a: any, b: any) => ((b as any).importanceScore || 0) - ((a as any).importanceScore || 0))
      .slice(0, 30); // Process top 30 hot stories

    console.log(`[Enrichment] Found ${hotClusters.length} hot stories for deep scraping.`);

    for (const cluster of hotClusters) {
      const { articles: clusterArticles } = await storage.listArticles({
        clusterId: cluster.id,
        limit: 10,
        status: "published"
      });

      // Find articles that haven't been scraped yet and haven't failed previously.
      // IMPORTANT: safely parse trace — may be stored as JSON string in DB.
      const pendingArticles = clusterArticles.filter((a: any) => {
        const trace = typeof a.trace === 'string' ? JSON.parse(a.trace) : (a.trace || {});
        const status = trace.status;
        return (!a.bodyHtml || a.bodyHtml.includes("Read full article at") || status === "metadata_only") &&
               status !== "enriched" &&
               status !== "failed";
      });

      if (pendingArticles.length > 0) {
        console.log(`[Enrichment] Story "${cluster.headline?.substring(0, 40)}..." has ${pendingArticles.length} pending articles.`);

        // Process max 3 articles per story concurrently — prevents DB pool exhaustion
        for (let i = 0; i < pendingArticles.length; i += 3) {
          const batch = pendingArticles.slice(i, i + 3);
          await Promise.all(
            batch.map((art: any) => scheduleContentEnrichment(art.id, art.sourceUrl || art.url, cluster.id))
          );
          // Small yield between batches
          await new Promise(r => setTimeout(r, 200));
        }
      }
    }
  } catch (err) {
    console.error("[Enrichment] Manager error:", err);
  }
}

// ─── VELOCITY MANAGER ────────────────────────────────────────────────────────

/**
 * Recalculates velocity and story phase for all active clusters.
 * Active clusters are defined as those with articles published in the last 72 hours.
 */
export async function runVelocityManager() {
  console.log("[Velocity] Running manager pass...");
  try {
    const activeThreshold = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const activeClusters = await db.select({ id: clusters.id })
      .from(clusters)
      .where(gte(clusters.lastUpdatedAt, activeThreshold))
      .limit(200);

    console.log(`[Velocity] Found ${activeClusters.length} active stories to check.`);

    for (const cluster of activeClusters) {
      await updateClusterVelocity(cluster.id);
      // Small delay to prevent hammering the DB
      await new Promise(r => setTimeout(r, 50));
    }
  } catch (err) {
    console.error("[Velocity] Manager error:", err);
  }
}

let enrichmentTimer: NodeJS.Timeout | null = null;
let velocityTimer: NodeJS.Timeout | null = null;
let analyticsTimer: NodeJS.Timeout | null = null;

export function runEnrichmentScheduler() {
  if (enrichmentTimer) return;
  console.log("[Enrichment] Scheduler started (every 2 mins)");
  enrichmentTimer = setInterval(runEnrichmentManager, 2 * 60 * 1000);
  setTimeout(runEnrichmentManager, 10000);
}

export function runVelocityScheduler() {
  if (velocityTimer) return;
  console.log("[Velocity] Scheduler started (every 5 mins)");
  velocityTimer = setInterval(runVelocityManager, 5 * 60 * 1000);
  // Initial run sooner
  setTimeout(runVelocityManager, 30000);
}

// ─── ANALYTICS MANAGER ───────────────────────────────────────────────────────
// Runs every 15 minutes. Updates importance, divergence, and confidence
// for all clusters active in the last 72 hours.

export async function runAnalyticsManager() {
  console.log("[Analytics] Running manager pass (importance + divergence + confidence)...");
  try {
    const activeThreshold = new Date(Date.now() - 72 * 60 * 60 * 1000);

    let activeClusters: { id: string }[] = [];
    try {
      activeClusters = await db.select({ id: clusters.id })
        .from(clusters)
        .where(gte(clusters.lastUpdatedAt, activeThreshold))
        .limit(150);
    } catch (err) {
      console.error("[Analytics] DB query failed:", err);
      return;
    }

    console.log(`[Analytics] Found ${activeClusters.length} active clusters to analyse.`);

    for (const cluster of activeClusters) {
      await updateClusterAnalytics(cluster.id);
      // Small yield between clusters — prevents DB pool exhaustion
      await new Promise(r => setTimeout(r, 100));
    }

    // Refresh materialised homepage cache with Diversity Guard
    await updateHomepageCache();

    // After all clusters updated, invalidate the homepage Redis cache (legacy fallback)
    try {
      const { connection } = await import("./queue");
      await connection.del("homepage:v1");
      console.log("[Analytics] Redis homepage cache cleared.");
    } catch { /* Redis not available — skip */ }

  } catch (err) {
    console.error("[Analytics] Manager error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLISHER HEALTH ENGINE (Phase 4)
// ─────────────────────────────────────────────────────────────────────────────

export async function updatePublisherReliability(publisherId: string) {
  const publisher = await storage.getPublisher(publisherId);
  if (!publisher) return;

  const factualityMap: Record<string, number> = {
    very_high: 100, high: 80, mixed: 50, low: 30, very_low: 10
  };

  const baseFactuality = factualityMap[publisher.factualityRating || ""] || 60;
  const uniqueness = publisher.uniquenessScore || 50;
  // Correction rate is high penalty
  const correctionPenalty = (publisher.correctionRate || 0) * 5;
  const consistency = publisher.consistencyScore || 70;

  // reliability = (factuality_base × 0.40 + uniqueness × 0.30 + correction_rate_penalty + consistency × 0.10)
  const reliabilityScore = Math.round(
    (baseFactuality * 0.40) +
    (uniqueness * 0.30) -
    correctionPenalty +
    (consistency * 0.10)
  );

  await storage.updatePublisher(publisherId, {
    reliabilityScore: Math.max(0, Math.min(100, reliabilityScore)),
    lastReliabilityUpdate: new Date()
  });
}

export async function runPublisherHealthManager() {
  console.log("[PublisherHealth] Running daily reliability refresh...");
  try {
    const publishersList = await storage.listPublishers();
    for (const p of publishersList) {
      await updatePublisherReliability(p.id);
      await updatePublisherUniqueness(p.id);
    }
  } catch (err) {
    console.error("[PublisherHealth] Manager error:", err);
  }
}
export async function updateHomepageCache() {
  console.log("[DiversityGuard] Refreshing materialised homepage cache...");
  try {
    // 1. Fetch top clusters by importance — Bypass Redis cache to get freshest data
    const { cache } = await import("./cache");
    const topClusters = await storage.getHomepageClusters(200);

    // 2. Greedy Allocation (Diversity Guard)
    const selectedClusters: any[] = [];
    const categoryCounts: Record<string, number> = {};
    const MAX_PER_CATEGORY = 15;
    const GLOBAL_LIMIT = 60;

    // First pass: try to enforce diversity quotas
    for (const cluster of topClusters) {
      if (selectedClusters.length >= GLOBAL_LIMIT) break;
      const cat = cluster.categorySlug || "general";
      const count = categoryCounts[cat] || 0;
      if (count < MAX_PER_CATEGORY) {
        selectedClusters.push(cluster);
        categoryCounts[cat] = count + 1;
      }
    }

    // Second pass: fill remaining slots to guarantee a full, continuous newspaper feed
    if (selectedClusters.length < GLOBAL_LIMIT) {
      for (const cluster of topClusters) {
        if (selectedClusters.length >= GLOBAL_LIMIT) break;
        if (!selectedClusters.some(sc => sc.id === cluster.id)) {
          selectedClusters.push(cluster);
        }
      }
    }

    if (selectedClusters.length === 0) return;

    // 3. Pre-aggregate Publisher Names for these clusters
    const clusterIds = selectedClusters.map((c: any) => c.clusterId).filter(Boolean);
    const { publishers, articles } = await import("../shared/schema");

    const pubData = await db.select({
      clusterId: articles.clusterId,
      names: sql<string>`string_agg(DISTINCT ${publishers.name}, ', ')`
    })
      .from(articles)
      .innerJoin(publishers, eq(articles.sourceId, publishers.id))
      .where(inArray(articles.clusterId, clusterIds))
      .groupBy(articles.clusterId);

    const pubMap = new Map(pubData.map((p: any) => [p.clusterId, p.names]));

    // 4. Build Final Story Objects (Zero-CPU for API)
    const finalStories = selectedClusters.map((c: any) => ({
      ...c,
      publisherNames: pubMap.get(c.clusterId) || c.publisher?.name || "Multiple Sources",
      // Include all new analytical signals
      divergenceScore: c.divergenceScore || 0,
      confidenceScore: c.confidenceScore || 50,
      narrativeLabel: c.narrativeLabel || "developing",
      qualityScore: c.qualityScore || 0,
      hasCorrection: c.hasCorrection || false,
      proEstablishmentCount: c.proEstablishmentCount || 0,
      proOppositionCount: c.proOppositionCount || 0,
      regionalAlignedCount: c.regionalAlignedCount || 0,
      neutralCount: c.neutralCount || 0,
      shannonDiversity: c.shannonDiversity || 0,
    }));

    // 5. Upsert into database cache table
    const { homepageCache } = await import("../shared/schema");
    await db.delete(homepageCache).where(eq(homepageCache.categorySlug, "all"));
    await db.insert(homepageCache).values({
      categorySlug: "all",
      data: finalStories,
      updatedAt: new Date()
    });

    if (cache) {
      await cache.set("homepage_clusters_final", finalStories, 300);
    }

    console.log(`[DiversityGuard] Homepage materialised with ${finalStories.length} diverse stories.`);
  } catch (err) {
    console.error("[DiversityGuard] Refresh failed:", err);
  }
}

export function runAnalyticsScheduler() {
  if (analyticsTimer) return;
  console.log("[Analytics] Scheduler started (every 15 mins)");
  analyticsTimer = setInterval(runAnalyticsManager, 15 * 60 * 1000);
  // Stagger initial run 90 seconds after velocity so they don't compete
  setTimeout(runAnalyticsManager, 90 * 1000);
}
