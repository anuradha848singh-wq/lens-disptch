/**
 * Topic-Based Source Discovery Engine
 * 
 * Scans ALL stored articles to find every source covering the same story.
 * Uses token Jaccard similarity + entity overlap (same algorithm as clustering)
 * but with a much lower threshold to maximize source density.
 */

import { storage } from "./storage";
import { type ArticleWithDetails } from "@shared/schema";

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
    left_count: number;
    center_count: number;
    right_count: number;
    left_percent: number;
    center_percent: number;
    right_percent: number;
  };
  sources: SourceResult[];
  ai_insights: string[];
}

const TOPIC_SIMILARITY_THRESHOLD = 0.06; // Very permissive for max density

export async function findSourcesForArticle(articleId: string): Promise<SourceDiscoveryResult | null> {
  const article = await storage.getArticle(articleId);
  if (!article) return null;

  // Use raw listing - no groupId deduplication - to see EVERY article/source
  const allArticles = await (storage as any).listAllArticlesRaw(5000);

  const scored: { article: ArticleWithDetails; score: number }[] = [];
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

  // PASS 2: Full similarity search across ALL articles (very low threshold)
  for (const candidate of allArticles) {
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
  }

  // PASS 3: Category-based broadening — if we have < 15 sources, add articles from same categories
  if (scored.length < 15) {
    const articleCatIds = new Set(article.categories?.map(c => c.id) || []);
    
    for (const candidate of allArticles) {
      if (seenIds.has(candidate.id)) continue;
      if (seenPublishers.has(candidate.publisherId)) continue;

      const candCatIds = candidate.categories?.map((c: any) => c.id) || [];
      const sharedCategory = candCatIds.some((cid: string) => articleCatIds.has(cid));
      
      if (sharedCategory) {
        // Check if they share at least ONE entity too (to avoid totally unrelated articles)
        const entA = extractEntities(`${article.title} ${article.excerpt || ""}`);
        const entB = extractEntities(`${candidate.title} ${candidate.excerpt || ""}`);
        const sharedEntity = Array.from(entA).some(e => entB.has(e));
        
        if (sharedEntity || scored.length < 5) {
          seenPublishers.add(candidate.publisherId);
          seenIds.add(candidate.id);
          scored.push({ article: candidate, score: 0.05 });
        }
      }
      
      if (scored.length >= 50) break;
    }
  }

  // PASS 4: If STILL sparse (< 5 sources), add recent articles from any category as "related coverage"
  if (scored.length < 5) {
    const sorted = [...allArticles].sort((a, b) => 
      (b.publishedAt || b.createdAt).getTime() - (a.publishedAt || a.createdAt).getTime()
    );
    
    for (const candidate of sorted) {
      if (seenIds.has(candidate.id)) continue;
      if (seenPublishers.has(candidate.publisherId)) continue;
      
      seenPublishers.add(candidate.publisherId);
      seenIds.add(candidate.id);
      scored.push({ article: candidate, score: 0.01 });
      
      if (scored.length >= 15) break;
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Build results
  const sources: SourceResult[] = scored.map(s => ({
    id: s.article.id,
    source_name: s.article.publisher?.name || "Unknown",
    article_title: s.article.title,
    published_at: (s.article.publishedAt || s.article.createdAt).toISOString(),
    bias_label: (s.article.bias?.toUpperCase() || "CENTER") as "LEFT" | "CENTER" | "RIGHT",
    factuality: (s.article.publisher?.factualityRating || "unknown").replace("_", " ").toUpperCase(),
    snippet: s.article.excerpt || "",
    source_url: s.article.sourceUrl || `/article/${s.article.id}`,
    similarity: Math.round(s.score * 100) / 100,
    publisher_id: s.article.publisherId,
    hero_image: s.article.heroImageUrl,
  }));

  const leftCount = sources.filter(s => s.bias_label === "LEFT").length;
  const centerCount = sources.filter(s => s.bias_label === "CENTER").length;
  const rightCount = sources.filter(s => s.bias_label === "RIGHT").length;
  const total = sources.length;

  return {
    story_id: article.clusterId || article.id,
    canonical_title: article.title,
    total_sources: total,
    bias_distribution: {
      left_count: leftCount,
      center_count: centerCount,
      right_count: rightCount,
      left_percent: total > 0 ? Math.round((leftCount / total) * 100) : 0,
      center_percent: total > 0 ? Math.round((centerCount / total) * 100) : 0,
      right_percent: total > 0 ? Math.round((rightCount / total) * 100) : 0,
    },
    sources,
    ai_insights: (article.aiInsights as string[]) || [],
  };
}
