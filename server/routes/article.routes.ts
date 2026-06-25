import { Router } from "express";
import { storage } from "../storage";
import { authenticateUser, optionalAuth, requireRole } from "../auth";
import { insertArticleSchema } from "../../shared/schema";
import { cache } from "../cache";
import { db } from "../db";
import { articles, publishers, clusters, homepageCache, userPreferences, clusterScores } from "../../shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { fetchFullContent } from "../article-scraper";
import { findSourcesForArticle } from "../topic-search";
import { deriveBiasLabel } from "../routes";

const articleRouter = Router();

// Public API middleware for caching
const publicCache = (res: any, ttl = 300) => {
  res.setHeader("Cache-Control", `public, s-maxage=${ttl}, stale-while-revalidate=${Math.round(ttl / 5)}`);
};

function sanitizeLikeInput(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

articleRouter.get("/trending", optionalAuth, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    // Redirect to the higher-fidelity cluster-based trending endpoint
    const window = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const data = await storage.getHomepageClusters(limit * 3);
    const trending = data
      .filter((c: any) => c.sourceCount >= 3 && new Date(c.lastUpdatedAt) >= window)
      .sort((a: any, b: any) => (b.importanceScore || 0) - (a.importanceScore || 0))
      .slice(0, limit);

    publicCache(res);
    res.json(trending);
  } catch (error) {
    console.error("Trending API error:", error);
    res.status(500).json({ error: "Failed to fetch trending stories" });
  }
});

articleRouter.get("/for-you", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const result = await storage.getForYouArticles(user.id, limit, offset);
    res.json(result);
  } catch (error) {
    console.error("For-you articles error:", error);
    res.status(500).json({ error: "Failed to get personalized articles" });
  }
});

articleRouter.get("/", optionalAuth, async (req, res) => {
  try {
    const { status, category, bias, publisherId, search, limit, offset } = req.query;
    const user = (req as any).user;
    
    const queryParams: any = {
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
    };

    if (status && !user) {
      queryParams.status = "published";
    } else if (status) {
      queryParams.status = status as any;
    } else if (!user || user.role !== "admin") {
      queryParams.status = "published";
    }

    if (category) queryParams.categoryId = category as string;
    if (bias) queryParams.bias = bias as string;
    if (publisherId) queryParams.sourceId = publisherId as string;
    if (search) queryParams.search = sanitizeLikeInput(search as string);

    // Cache key excludes user ID — same articles for all users with same query
    const cacheKey = `articles:${JSON.stringify(queryParams)}`;
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    } catch (err) {
      console.error("[Cache] Error:", err);
    }

    const result = await storage.listArticles(queryParams);
    result.articles = result.articles.map((a: any) => ({
      ...a,
      bias: deriveBiasLabel(a.biasScore, a.publisher?.biasRating)
    }));

    // Populate cache for subsequent identical queries (2 min TTL)
    try { await cache.set(cacheKey, result, 120); } catch (_) {}

    publicCache(res);
    res.json(result);
  } catch (error) {
    console.error("List articles error:", error);
    res.status(500).json({ error: "Failed to list articles" });
  }
});

articleRouter.get("/:id/full-content", optionalAuth, async (req, res) => {
  try {
    const article = await storage.getArticle(req.params.id);
    if (!article) return res.status(404).json({ error: "Article not found" });

    // Use pre-scraped content from background worker
    const content = article.fullContent || article.bodyHtml || article.excerpt;
    
    if (!content && article.sourceUrl) {
      // Emergency fallback if background worker hasn't finished or failed
      console.log(`[scraper] Emergency fallback scraping for: ${article.sourceUrl}`);
      const scraped = await fetchFullContent(article.sourceUrl);
      if (scraped && scraped.bodyHtml) {
        await storage.updateArticleContent(article.id, scraped.bodyHtml);
        return res.json({ fullContent: scraped.bodyHtml });
      }
    }

    res.json({ fullContent: content || "Content not available" });
  } catch (error) {
    console.error("Scrape error:", error);
    res.status(500).json({ error: "Failed to retrieve article content" });
  }
});

articleRouter.get("/:id/full", optionalAuth, async (req, res) => {
  try {
    const articleId = req.params.id;
    // 1. Fetch main article details
    const article = await storage.getArticle(articleId);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    const user = (req as any).user;
    if (article.status !== "published" && (!user || user.role !== "admin")) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Attach aiInsights if cluster exists and not present
    if (article.clusterId && (!article.aiInsights || article.aiInsights.length === 0)) {
      try {
        const [clusterRow] = await db
          .select({ aiSummary: clusters.aiSummary })
          .from(clusters)
          .where(eq(clusters.id, article.clusterId))
          .limit(1);

        if (clusterRow?.aiSummary && (clusterRow.aiSummary as string[]).length > 0) {
          (article as any).aiInsights = clusterRow.aiSummary;
        } else {
          // Trigger fallback summary job in background
          import("../queue").then(({ heavyTaskQueue }) => {
            heavyTaskQueue.add("summary", { type: "summary", clusterId: article.clusterId });
          }).catch(err => console.error("Synthesis queue error:", err));
        }
      } catch (err) {
        console.error("FLAN summary fetch error in /full:", err);
      }
    }

    // Prepare cluster queries
    let cluster = null;
    let deepIntelligence = null;
    
    if (article.clusterId) {
      // 2. Fetch cluster details & enrich with coverage gaps
      const clusterRaw = await storage.getCluster(article.clusterId);
      if (clusterRaw) {
        const gaps: string[] = [];
        if (clusterRaw.proEstablishmentCount === 0 && clusterRaw.proOppositionCount > 0) gaps.push("pro_opposition");
        if (clusterRaw.proOppositionCount === 0 && clusterRaw.proEstablishmentCount > 0) gaps.push("pro_establishment");
        if (clusterRaw.neutralCount === 0 && (clusterRaw.proEstablishmentCount > 0 || clusterRaw.proOppositionCount > 0)) gaps.push("neutral");

        cluster = {
          ...clusterRaw,
          coverage_gaps: gaps,
          blindspotMessage: gaps.length > 0 
            ? `${gaps.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(" & ")}-leaning sources are currently ignoring this story.` 
            : null
        };
      }

      // 3. Fetch deep intelligence dashboard data
      deepIntelligence = await cache.fetch(`cluster:deep:${article.clusterId}`, async () => {
        if (!clusterRaw) return null;

        // Fetch all published articles in cluster for analysis
        const { articles: clusterArticles } = await storage.listArticles({ clusterId: article.clusterId, status: "published", limit: 100 });

        // Identify Origin Source
        let originSource = null;
        if (clusterRaw.originPublisherId) {
          originSource = await storage.getPublisher(clusterRaw.originPublisherId);
        } else if (clusterArticles.length > 0) {
          const sorted = [...clusterArticles].sort((a,b) => 
            new Date(a.publishedAt || 0).getTime() - new Date(b.publishedAt || 0).getTime()
          );
          originSource = sorted[0]?.publisher;
        }

        return {
          id: clusterRaw.id,
          headline: clusterRaw.headline,
          summary: clusterRaw.summary,
          origin: {
            publisher: originSource,
            publishedAt: clusterRaw.originPublishedAt || (clusterArticles.length > 0 ? clusterArticles[0].publishedAt : null)
          },
          intelligence: {
            sdi: clusterRaw.shannonDiversity || 0,
            geography: (clusterRaw.geographyAggs as any) || {},
            sourceCount: clusterRaw.sourceCount || clusterArticles.length,
            blindspotScore: clusterRaw.blindspotScore || 0,
            blindspotSide: clusterRaw.blindspotSide
          },
          articles: clusterArticles
        };
      }, 300);
    }

    // 4. Fetch related articles (10 min TTL)
    const related = await cache.fetch(
      `related_articles:${articleId}`,
      () => storage.getRelatedArticles(articleId),
      600
    );

    // 5. Fetch similar articles (5 min TTL)
    const similar = await cache.fetch(
      `similar_articles:${articleId}`,
      () => storage.getSimilarArticles(articleId),
      300
    );

    // 6. Fetch publisher articles if sourceId exists
    let publisherArticles = { articles: [], total: 0 };
    if (article.sourceId) {
      publisherArticles = await storage.listArticles({
        sourceId: article.sourceId,
        limit: 9,
        status: "published",
      });
    }

    // 6.5. Fetch cluster scores for Multi-Lens Mode
    let multiLensScores = [];
    if (article.clusterId) {
      multiLensScores = await db.select()
        .from(clusterScores)
        .where(eq(clusterScores.clusterId, article.clusterId));
    }

    // 7. Assemble and return the complete payload
    publicCache(res, 60); // 1 minute Cache-Control for full page package
    res.json({
      article,
      cluster,
      deepIntelligence,
      related,
      similar,
      publisherArticles,
      multiLensScores
    });
  } catch (error) {
    console.error("Get full article data pack error:", error);
    res.status(500).json({ error: "Failed to get complete article data pack" });
  }
});

articleRouter.get("/:id", optionalAuth, async (req, res) => {
  try {
    const article = await storage.getArticle(req.params.id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    const user = (req as any).user;
    if (article.status !== "published" && (!user || user.role !== "admin")) {
      return res.status(404).json({ error: "Article not found" });
    }



    // If FLAN has enriched the cluster, inject ai_summary into aiInsights
    // so the frontend gets FLAN bullets without any frontend changes
    if (article.clusterId && (!article.aiInsights || article.aiInsights.length === 0)) {
      try {
        const [clusterRow] = await db
          .select({ aiSummary: clusters.aiSummary })
          .from(clusters)
          .where(eq(clusters.id, article.clusterId))
          .limit(1);

        if (clusterRow?.aiSummary && (clusterRow.aiSummary as string[]).length > 0) {
          // FLAN summary exists — attach it to the article response
          (article as any).aiInsights = clusterRow.aiSummary;
        } else {
          // No FLAN summary yet — trigger BullMQ fallback
          import("../queue").then(({ heavyTaskQueue }) => {
            heavyTaskQueue.add("summary", { type: "summary", clusterId: article.clusterId });
          }).catch(err => console.error("Synthesis queue error:", err));
        }
      } catch (err) {
        console.error("FLAN summary fetch error:", err);
      }
    }
    publicCache(res, 60); // 1 minute cache for articles
  res.json(article);
  } catch (error) {
    console.error("Get article error:", error);
    res.status(500).json({ error: "Failed to get article" });
  }
});

articleRouter.post("/:id/view", optionalAuth, async (req, res) => {
  try {
    // Explicitly prevent caching for tracking endpoints
    res.setHeader("Cache-Control", "no-store, max-age=0");
    
    await storage.trackArticleView({
      articleId: req.params.id,
      viewerId: (req as any).user?.id || null,
      referrer: req.get('referer') || req.body?.referrer || null,
      metadata: null,
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Track view error:", error);
    res.status(500).json({ error: "Failed to track view" });
  }
});

articleRouter.get("/:id/related", optionalAuth, async (req, res) => {
  try {
    const data = await cache.fetch(
      `related_articles:${req.params.id}`,
      () => storage.getRelatedArticles(req.params.id),
      600  // 10 min — related articles change slowly
    );
    publicCache(res, 600); // 10 min cache
    res.json(data);
  } catch (error) {
    console.error("Get related articles error:", error);
    res.status(500).json({ error: "Failed to get related articles" });
  }
});

articleRouter.get("/:id/similar", optionalAuth, async (req, res) => {
  try {
    const data = await cache.fetch(
      `similar_articles:${req.params.id}`,
      () => storage.getSimilarArticles(req.params.id),
      300  // 5 min — new sources can appear as story develops
    );
    publicCache(res, 300); // 5 min cache
    res.json(data);
  } catch (error) {
    console.error("Get similar articles error:", error);
    res.status(500).json({ error: "Failed to get similar articles" });
  }
});

articleRouter.post("/", authenticateUser, requireRole("admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const { categoryIds = [], tagIds = [], ...articleData } = req.body;
    
    const data = insertArticleSchema.parse({
      ...articleData,
      authorId: user.id,
    });

    const article = await storage.createArticle(data, categoryIds, tagIds);
    res.status(201).json(article);
  } catch (error: any) {
    console.error("Create article error:", error);
    res.status(400).json({ error: error.message || "Failed to create article" });
  }
});

articleRouter.patch("/:id", authenticateUser, requireRole("admin"), async (req, res) => {
  try {
    const { categoryIds, tagIds, ...updateData } = req.body;
    const updated = await storage.updateArticle(req.params.id, updateData, categoryIds, tagIds);
    res.json(updated);
  } catch (error: any) {
    console.error("Update article error:", error);
    res.status(400).json({ error: error.message || "Failed to update article" });
  }
});

articleRouter.post("/:id/publish", authenticateUser, requireRole("admin"), async (req, res) => {
  try {
    const published = await storage.publishArticle(req.params.id);
    res.json(published);
  } catch (error: any) {
    console.error("Publish article error:", error);
    res.status(400).json({ error: error.message || "Failed to publish article" });
  }
});

articleRouter.delete("/:id", authenticateUser, requireRole("admin"), async (req, res) => {
  try {
    const article = await storage.getArticle(req.params.id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    await storage.deleteArticle(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete article error:", error);
    res.status(400).json({ error: error.message || "Failed to delete article" });
  }
});

articleRouter.post("/:id/share", optionalAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { platform = "copy" } = req.body;
    const event = await storage.trackShare(req.params.id, user?.id || null, platform);
    res.json(event);
  } catch (error) {
    console.error("Share tracking error:", error);
    res.status(500).json({ error: "Failed to track share" });
  }
});

articleRouter.get("/:id/omissions", optionalAuth, async (req, res) => {
  try {
    const articleId = req.params.id;
    // 1. Get the article to find its cluster
    const article = await storage.getArticle(articleId);
    if (!article || !article.clusterId) {
      return res.json([]);
    }

    // 2. Fetch all articles in the cluster
    const clusterArticles = await db.query.articles.findMany({
      where: eq(articles.clusterId, article.clusterId),
      with: { publisher: true }
    });

    // 3. Aggregate entities from cluster
    const thisArticleEntities = new Set((article.entities as string[]) || []);
    
    // Map of omittedEntityName -> Set of publisher names that mentioned it
    const omissionsMap = new Map<string, Set<string>>();

    for (const ca of clusterArticles) {
      if (ca.id === article.id) continue;
      
      const entities = (ca.entities as string[]) || [];
      const pubName = ca.publisher?.name || "Unknown";
      
      for (const e of entities) {
        if (!thisArticleEntities.has(e)) {
          if (!omissionsMap.has(e)) omissionsMap.set(e, new Set());
          omissionsMap.get(e)!.add(pubName);
        }
      }
    }

    // 4. Filter and format output
    const omissions = Array.from(omissionsMap.entries())
      .map(([entity, publishers]) => ({
        entity,
        mentionedBy: Array.from(publishers)
      }))
      .filter(o => o.mentionedBy.length >= 2) // High frequency filter
      .sort((a, b) => b.mentionedBy.length - a.mentionedBy.length)
      .slice(0, 10); // Top 10 omissions

    res.json(omissions);
  } catch (error) {
    console.error("Omissions API error:", error);
    res.status(500).json({ error: "Failed to fetch article omissions" });
  }
});

export { articleRouter };
