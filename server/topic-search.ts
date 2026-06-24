/**
 * Topic-Based Source Discovery Engine
 * 
 * Scans ALL stored articles to find every source covering the same story.
 * Uses token Jaccard similarity + entity overlap (same algorithm as clustering)
 * but with a much lower threshold to maximize source density.
 */

import { storage } from "./storage";
import { type ArticleWithDetails, type Publisher } from "../shared/schema";

// ── Token & Entity extraction (mirrored from news-fetcher for decoupling) ──

const STOP_WORDS = new Set([
  "this", "that", "with", "from", "they", "will", "would", "could", "should",
  "what", "when", "where", "which", "there", "their", "have", "been", "were",
  "also", "into", "over", "after", "some", "them", "because", "about", "these",
  "only", "more", "than", "other", "just", "like", "says", "said", "news",
  "report", "reports", "according", "year", "years", "make", "made", "time",
  "first", "last", "back", "much", "most",
]);

function extractTokens(text: string): Set<string> {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, "").trim();
  const words = normalized.split(/\s+/).filter(w => w.length > 3);
  return new Set(words.filter(w => !STOP_WORDS.has(w)));
}

function extractEntities(text: string): Set<string> {
  const matches = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
  return new Set(matches);
}

// ── Similarity scoring ──

function topicSimilarity(
  titleA: string, excerptA: string,
  titleB: string, excerptB: string
): number {
  // 1. Title Token Jaccard (weight 0.50)
  const tokA = extractTokens(titleA);
  const tokB = extractTokens(titleB);
  const tokIntersect = Array.from(tokA).filter(t => tokB.has(t)).length;
  const tokUnion = new Set([...Array.from(tokA), ...Array.from(tokB)]).size;
  const titleJaccard = tokUnion > 0 ? tokIntersect / tokUnion : 0;

  // 2. Entity Overlap (weight 0.35)
  const entA = extractEntities(`${titleA} ${excerptA}`);
  const entB = extractEntities(`${titleB} ${excerptB}`);
  const entIntersect = Array.from(entA).filter(e => entB.has(e)).length;
  const entUnion = new Set([...Array.from(entA), ...Array.from(entB)]).size;
  const entityJaccard = entUnion > 0 ? entIntersect / entUnion : 0;

  // 3. Substring containment bonus (weight 0.15)
  const normA = titleA.toLowerCase().replace(/[^\w\s]/g, "").trim();
  const normB = titleB.toLowerCase().replace(/[^\w\s]/g, "").trim();
  let substringBonus = 0;
  if (normA.length > 15 && normB.length > 15) {
    if (normA.includes(normB) || normB.includes(normA)) {
      substringBonus = 1.0;
    }
  }

  return 0.50 * titleJaccard + 0.35 * entityJaccard + 0.15 * substringBonus;
}

// ── Public API ──

export interface SourceResult {
  id: string;
  source_name: string;
  article_title: string;
  published_at: string;
  bias_label: "LEFT" | "CENTER" | "RIGHT";
  factuality: string;
  snippet: string;
  source_url: string;
  similarity: number;
  publisher_id: string;
  hero_image?: string | null;
}

export interface SourceDiscoveryResult {
  story_id: string;
  canonical_title: string;
  total_sources: number;
  bias_distribution: {
    pro_establishment_count: number;
    neutral_count: number;
    pro_opposition_count: number;
    left_percent: number;
    center_percent: number;
    right_percent: number;
  };
  sources: SourceResult[];
  ai_insights: string[];
}

const TOPIC_SIMILARITY_THRESHOLD = 0.12; // Lowered from 0.18 for maximum story breadth

const sourceCache = new Map<string, { data: SourceDiscoveryResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function findSourcesForArticle(articleId: string): Promise<SourceDiscoveryResult | null> {
  const cached = sourceCache.get(articleId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const article = await storage.getArticle(articleId);
  if (!article) return null;

  // Fetch all publishers once to map properties without N+1 queries
  const allPublishers = await storage.listPublishers();
  const pubMap = new Map<string, Publisher>(allPublishers.map((p: any) => [p.id, p]));

  // Use raw listing - no N+1 deduplication - to see EVERY article/source instantly
  // Reduced limit from 5000 to 2000 for faster scans
  const allArticles = await (storage as any).listAllArticlesRaw(2000);

  const scored: { article: any; score: number }[] = [];
  const seenPublishers = new Set<string>();
  const seenIds = new Set<string>([article.id]);

  // PASS 1: Same clusterId (already clustered)
  const groupMatches = article.clusterId 
    ? allArticles.filter((a: any) => a.clusterId === article.clusterId && a.id !== article.id)
    : [];

  for (const gm of groupMatches) {
    if (!seenPublishers.has(gm.publisherId) && !seenIds.has(gm.id)) {
      seenPublishers.add(gm.publisherId);
      seenIds.add(gm.id);
      scored.push({ article: gm, score: 1.0 });
    }
  }

  // PASS 2: Limited similarity search — only if we need more sources
  if (scored.length < 5) {
    // Limit search to most recent 500 articles to avoid extreme O(N) performance hit
    const recentCandidates = allArticles.slice(0, 500);
    
    let loopCount = 0;
    for (const candidate of recentCandidates) {
      loopCount++;
      // Yield to event loop every 50 iterations to prevent blocking incoming HTTP requests
      if (loopCount % 50 === 0) {
        await new Promise(r => setImmediate(r));
      }

      if (seenIds.has(candidate.id)) continue;
      if (seenPublishers.has(candidate.publisherId)) continue;

      const score = topicSimilarity(
        article.title, article.excerpt || "",
        candidate.title, candidate.excerpt || ""
      );

      if (score >= TOPIC_SIMILARITY_THRESHOLD) {
        seenPublishers.add(candidate.publisherId);
        seenIds.add(candidate.id);
        scored.push({ article: candidate, score });
      }
      
      if (scored.length >= 20) break;
    }
  }

  // Sort by score descending
  scored.sort((a: any, b: any) => b.score - a.score);

  // Build results using our manual publisher map
  const sources: SourceResult[] = scored.map(s => {
    const pub = pubMap.get(s.article.publisherId) as any;
    return {
      id: s.article.id,
      source_name: pub?.name || "Unknown",
      article_title: s.article.title,
      published_at: (s.article.publishedAt || s.article.createdAt).toISOString(),
      bias_label: (s.article.bias?.toUpperCase() || "CENTER") as "LEFT" | "CENTER" | "RIGHT",
      factuality: (pub?.factualityRating || "unknown").replace("_", " ").toUpperCase(),
      snippet: s.article.excerpt || "",
      source_url: s.article.sourceUrl || `/article/${s.article.id}`,
      similarity: Math.round(s.score * 100) / 100,
      publisher_id: s.article.publisherId,
      hero_image: s.article.heroImageUrl,
    };
  });

  const proEstablishmentCount = sources.filter(s => s.bias_label === "LEFT").length;
  const neutralCount = sources.filter(s => s.bias_label === "CENTER").length;
  const proOppositionCount = sources.filter(s => s.bias_label === "RIGHT").length;
  const total = sources.length;

  const result: SourceDiscoveryResult = {
    story_id: article.clusterId || article.id,
    canonical_title: article.title,
    total_sources: total,
    bias_distribution: {
      pro_establishment_count: proEstablishmentCount,
      neutral_count: neutralCount,
      pro_opposition_count: proOppositionCount,
      left_percent: total > 0 ? Math.round((proEstablishmentCount / total) * 100) : 0,
      center_percent: total > 0 ? Math.round((neutralCount / total) * 100) : 0,
      right_percent: total > 0 ? Math.round((proOppositionCount / total) * 100) : 0,
    },
    sources,
    ai_insights: (article.aiInsights as string[]) || [],
  };

  sourceCache.set(articleId, { data: result, timestamp: Date.now() });
  return result;
}
