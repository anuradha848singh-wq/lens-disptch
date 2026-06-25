import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword, verifyPassword, generateSessionToken, authenticateUser, requireRole, optionalAuth } from "./auth";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { 
  insertUserSchema, insertUserProfileSchema, insertPublisherSchema,
  insertCategorySchema, insertClusterSchema, insertArticleSchema,
  insertTagSchema, insertSystemSettingsSchema,
  type Category, type Publisher, type Cluster, type Article
} from "../shared/schema";
import { fetchFullContent } from "./article-scraper";
import { findSourcesForArticle } from "./topic-search";
import { getAdminFetcherStatus, updateAdminFetcherConfig, addCustomSource, fetchRealNews } from "./news-fetcher";
import { metrics, resolveError, recordApiCall, getQueueDepth } from "./metrics";
import { connection } from "./queue";
import { db } from "./db";
import { articles, publishers, clusters, homepageCache, userPreferences, articleCategories, categories, articleTags, tags } from "../shared/schema";
import { eq, inArray, sql, and, desc, gte } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { cache, CACHE_KEYS } from "./cache";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import type { AuthenticatedRequest, OptionalAuthRequest } from "./types";
import { authRouter } from "./routes/auth.routes";
import { articleRouter } from "./routes/article.routes";
import { publisherRouter } from "./routes/publisher.routes";
import { clusterRouter } from "./routes/cluster.routes";
import { analyticsRouter } from "./routes/analytics.routes";
import { socialRouter } from "./routes/social.routes";
import { ogRouter } from "./routes/og.routes";
import { queryLogs, generateDiagnosis, exportCurrentSession, getLogFilesSummary, logClientError } from "./logger";
import type { LogLevel, LogSource } from "./logger";

/** Sanitize user input for SQL LIKE patterns to prevent wildcard injection */
function sanitizeLikeInput(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

/** Safely exclude passwordHash from user object */
function sanitizeUser(user: any) {
  const { passwordHash, ...safe } = user;
  return safe;
}

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = loginSchema.extend({
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
});

export function deriveBiasLabel(
  biasScore: number | null | undefined,
  publisherBiasRating: string | null | undefined
): "pro_opposition" | "neutral" | "pro_establishment" | null {
  // Prefer the string rating from the publisher (more accurate)
  if (publisherBiasRating) {
    const r = publisherBiasRating.toLowerCase();
    if (r.includes("pro_opposition"))  return "pro_opposition";
    if (r.includes("pro_establishment")) return "pro_establishment";
    if (r.includes("neutral")) return "neutral";
  }
  // Fall back to numeric score
  if (biasScore != null) {
    const s = Number(biasScore);
    if (s < -15) return "pro_opposition";
    if (s >  15) return "pro_establishment";
    return "neutral";
  }
  return null;
}


function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests." }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts." }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "uploads");
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Public API middleware for caching
const publicCache = (res: any, ttl = 300) => {
  res.setHeader("Cache-Control", `public, s-maxage=${ttl}, stale-while-revalidate=${Math.round(ttl / 5)}`);
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health", async (req, res) => {
    const health: Record<string, "ok" | "degraded" | "down"> = {
      db: "down",
      redis: "down",
      groq: process.env.GROQ_API_KEY ? "ok" : "down",
      jina: process.env.JINA_API_KEY ? "ok" : "down",
    };

    try {
      await db.execute(sql`SELECT 1`);
      health.db = "ok";
    } catch (err: any) {
      console.error("[HealthCheck] DB health check failed:", err.message);
      health.db = "down";
    }

    let queueDepth: any = null;
    try {
      const { connection } = await import("./queue");
      await connection.ping();
      health.redis = "ok";
      queueDepth = await getQueueDepth();
    } catch (err: any) {
      console.error("[HealthCheck] Redis/Queue health check failed:", err.message);
      health.redis = "down";
    }

    try {
      const { isCircuitOpen } = await import("./lib/embeddings-client");
      if (isCircuitOpen()) {
        health.jina = "degraded";
      }
    } catch (e) {}

    const allOk = Object.values(health).every(v => v === "ok");
    const anyDown = Object.values(health).some(v => v === "down");

    res.status(anyDown ? 503 : 200).json({
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: health,
      metrics: {
        queueDepth
      }
    });
  });
  
  // Note: express.json() and express.urlencoded() are already registered in index.ts
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  app.use('/api/', generalLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // API metrics middleware — records every call automatically
  app.use('/api/', (req: any, res: any, next: any) => {
    const start = Date.now();
    res.on('finish', () => {
      recordApiCall({
        endpoint: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      });
    });
    next();
  });

  // ==================== AUTH ====================
  app.use("/api/auth", authRouter);

  app.get("/api/auth/me", authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      const profile = await storage.getUserProfile(user.id);
      res.json({ user: sanitizeUser(user), profile });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // ==================== PUBLISHERS ====================
  app.use("/api/publishers", publisherRouter);

  // ==================== CATEGORIES & TAGS ====================

  app.get("/api/categories", async (req, res) => {
    try {
      const cats = await storage.listCategories();
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.json(cats);
    } catch (error) {
      console.error("List categories error:", error);
      res.status(500).json({ error: "Failed to list categories" });
    }
  });

  app.post("/api/categories", authenticateUser, requireRole("admin"), async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(data);
      res.status(201).json(category);
    } catch (error: any) {
      console.error("Create category error:", error);
      res.status(400).json({ error: error.message || "Failed to create category" });
    }
  });

  app.get("/api/tags", async (req, res) => {
    try {
      const tags = await storage.listTags();
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.json(tags);
    } catch (error) {
      console.error("List tags error:", error);
      res.status(500).json({ error: "Failed to list tags" });
    }
  });

  app.post("/api/tags", authenticateUser, async (req, res) => {
    try {
      const data = insertTagSchema.parse(req.body);
      const tag = await storage.createTag(data);
      res.status(201).json(tag);
    } catch (error: any) {
      console.error("Create tag error:", error);
      res.status(400).json({ error: error.message || "Failed to create tag" });
    }
  });

  // ── High-Fidelity Engagement Signals ───────────────────────────────────────

  /**
   * Returns top 10 trending clusters from the last 12 hours with at least 3 sources.
   * Sorted by importanceScore.
   */
  app.get("/api/trending", optionalAuth, async (req, res) => {
    try {
      const window = new Date(Date.now() - 12 * 60 * 60 * 1000);
      
      // Get trending clusters with their most important article
      const data = await storage.getHomepageClusters(10);
      const filtered = data.filter((c: any) => 
        c.sourceCount >= 3 && new Date(c.lastUpdatedAt) >= window
      ).sort((a: any, b: any) => (b.importanceScore || 0) - (a.importanceScore || 0));
      
      publicCache(res);
      res.json(filtered);
    } catch (error) {
      console.error("Trending API error:", error);
      res.status(500).json({ error: "Failed to fetch trending stories" });
    }
  });

  app.get("/api/blindspots", optionalAuth, async (req, res) => {
    try {
      const window = new Date(Date.now() - 48 * 60 * 60 * 1000);
      
      // Get clusters with article data
      const data = await storage.getHomepageClusters(100);
      
      const blindspots = data.filter((c: any) => {
        if (new Date(c.lastUpdatedAt) < window) return false;
        if (c.sourceCount < 4) return false;

        const left = c.proEstablishmentCount || 0;
        const right = c.proOppositionCount || 0;
        
        if (left === 0 && right >= 4) return true;
        if (right === 0 && left >= 4) return true;
        if (left > 0 && right > 0) {
          return (left / right >= 5) || (right / left >= 5);
        }
        return false;
      }).sort((a: any, b: any) => (b.importanceScore || 0) - (a.importanceScore || 0));

      publicCache(res);
      res.json(blindspots.slice(0, 20));
    } catch (error) {
      console.error("Blindspots API error:", error);
      res.status(500).json({ error: "Failed to fetch blindspots" });
    }
  });

  // ==================== ANALYTICS ====================
  app.use("/api/analytics", analyticsRouter);

  // Cluster impact and publisher radar routes are in cluster.routes.ts and publisher.routes.ts

  // Publisher fingerprint route is in publisher.routes.ts
  // Analytics droughts route is in analytics.routes.ts




  // ==================== ARTICLES ====================

  // IMPORTANT: /api/articles/trending and /api/articles/for-you MUST be before /api/articles/:id
  app.get("/api/force-fetch", authenticateUser, requireRole("admin"), async (req, res) => {
    try {
      const { fetchRealNews } = await import("./news-fetcher");
      const count = await fetchRealNews();
      res.json({ success: true, count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/homepage", optionalAuth, async (req, res) => {
    try {
      const categoryId = (req.query.categoryId as string) || null;
      const search = (req.query.search as string) || null;
      const category = categoryId || (req.query.category as string) || "all";
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const market = (req.query.market as string) || "US";
      
      let data: any[] = [];
      let source = "live_query";

      // Serve from materialized homepageCache (Zero-CPU) for first page
      // Covers both the default 'all' category AND the most common market (US)
      if (offset === 0 && !search && (!category || category === "all") &&
          (!market || market === "GLOBAL" || market === "US")) {
        try {
          const [cacheRow] = await db.select()
            .from(homepageCache)
            .where(eq(homepageCache.categorySlug, category))
            .limit(1);

          if (cacheRow && cacheRow.data && Array.isArray(cacheRow.data) && (cacheRow.data as any[]).length > 0) {
            data = (cacheRow.data as any[]).slice(0, limit);
            source = "materialized_cache";
          }
        } catch (e) {
          // DB cache table might not exist yet — that's okay
        }
      }

      // ALWAYS fall back to live computation if cache is empty or we're paginating past cache
      if (data.length === 0) {
        // Sanitize search to prevent LIKE wildcard injection before passing to storage
        const safeSearch = search ? sanitizeLikeInput(search) : null;
        data = await storage.getHomepageClusters(limit, offset, safeSearch, category, market);
        source = "live_query";
      }

      // PERSONALIZATION: If logged in, generate algorithmic feed
      const user = (req as any).user;
      if (user && offset === 0) { // Only personalize the first page to avoid weird shifting on pagination
        try {
          const { generateAlgorithmicFeed } = await import("./personalization");
          const algoFeed = await generateAlgorithmicFeed(user.id, limit);
          
          if (algoFeed && algoFeed.length > 0) {
            data = algoFeed;
            source = "algorithmic_feed";
          } else {
            // Fallback to basic personalization if no vector exists
            const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, user.id)).limit(1);
            if (prefs) {
              const { followedCategories = [], followedTopics = [] } = prefs;
              if (followedCategories.length > 0 || followedTopics.length > 0) {
                data = [...data].sort((a: any, b: any) => {
                  const aBoost = followedCategories.includes(a.category) || (a.topic && followedTopics.includes(a.topic)) ? 1 : 0;
                  const bBoost = followedCategories.includes(b.category) || (b.topic && followedTopics.includes(b.topic)) ? 1 : 0;
                  if (aBoost !== bBoost) return bBoost - aBoost;
                  return (b.importanceScore || 0) - (a.importanceScore || 0);
                });
              }
            }
          }
        } catch (e) {
          console.error("[Personalization] Fallback to chron feed due to error:", e);
        }
      }

      // No hydration needed: the preprocessor (updateHomepageCache) already 
      // builds 'publisherNames' so the API can serve this block instantly.

      publicCache(res);
      res.json(data);
    } catch (error) {
      console.error("Homepage clusters error:", error);
      res.status(500).json({ error: "Failed to get homepage clusters" });
    }
  });

  app.get("/api/homepage/lean", async (req, res) => {
    try {
      const data = await cache.fetch("homepage:lean:v2", async () => {
        // Use exact enum equality — avoids full-table text scan that LIKE '%left%' caused
        const result = await db.execute(sql`
          SELECT
            COUNT(*) FILTER (WHERE p.bias_rating = 'pro_establishment') AS pro_establishment_count,
            COUNT(*) FILTER (WHERE p.bias_rating = 'neutral')           AS neutral_count,
            COUNT(*) FILTER (WHERE p.bias_rating = 'pro_opposition')    AS pro_opposition_count
          FROM ${articles} a
          INNER JOIN ${publishers} p ON a.source_id = p.id
          WHERE a.published_at > NOW() - INTERVAL '24 hours'
            AND a.status = 'published'
        `);
        const { pro_establishment_count: l, neutral_count: c, pro_opposition_count: r } = result.rows[0] as any;
        const total = Number(l) + Number(c) + Number(r) || 1;
        return {
          leftPct:   Math.round(Number(l)/total*100),
          centerPct: Math.round(Number(c)/total*100),
          rightPct:  Math.round(Number(r)/total*100),
        };
      }, 300);
      publicCache(res, 300);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch lean" });
    }
  });

  app.get("/api/articles/polarizing", async (req, res) => {
    try {
      const data = await cache.fetch("articles:polarizing:v1", async () => {
        const result = await db.execute(sql`
          SELECT id, headline, source_count as "sourceCount", pro_establishment_count as "proEstablishmentCount",
                 neutral_count as "neutralCount", pro_opposition_count as "proOppositionCount", importance_score as "importanceScore",
                 category_slug as "categorySlug", last_updated_at as "lastUpdatedAt"
          FROM ${clusters}
          WHERE pro_establishment_count >= 2
            AND pro_opposition_count >= 2
            AND source_count >= 2
            AND last_updated_at > NOW() - INTERVAL '48 hours'
          ORDER BY (pro_establishment_count + pro_opposition_count) DESC,
                   ABS(pro_establishment_count - pro_opposition_count) DESC
          LIMIT 1
        `);
        return result.rows[0] || null;
      }, 600);
      publicCache(res, 600);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch polarizing" });
    }
  });

  app.get("/api/system/stats", async (req, res) => {
    try {
      const data = await cache.fetch("system:stats:v2", async () => {
        // Single query with parallel aggregates — replaces 5 serial subqueries
        const result = await db.execute(sql`
          SELECT
            (SELECT COUNT(*) FROM ${publishers} WHERE active = true)::int          AS "totalPublishers",
            (SELECT COUNT(DISTINCT country) FROM ${publishers}
               WHERE country IS NOT NULL)::int                                      AS "totalCountries",
            (SELECT COUNT(*) FROM ${articles} WHERE status = 'published')::int     AS "totalArticles",
            (SELECT COUNT(*) FROM ${clusters} WHERE source_count >= 1)::int        AS "totalClusters",
            (SELECT COUNT(*) FROM ${articles} WHERE status = 'published')::int     AS "totalBiasEvents"
        `);
        return result.rows[0];
      }, 3600); // 1-hour TTL — these stats only need to be accurate within an hour
      publicCache(res, 3600);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/tags/trending", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 8;
      const data = await cache.fetch(`tags:trending:${limit}`, async () => {
        const result = await db.execute(sql`
          WITH mentions_last_6h AS (
            SELECT t.id, t.name, t.slug, COUNT(at.article_id) AS freq_6h
            FROM ${articleTags} at
            JOIN ${tags} t ON t.id = at.tag_id
            JOIN ${articles} a ON a.id = at.article_id
            WHERE a.published_at > NOW() - INTERVAL '6 hours'
              AND a.status = 'published'
            GROUP BY t.id, t.name, t.slug
          ),
          mentions_last_7d AS (
            SELECT t.id, COUNT(at.article_id) / 28.0 AS avg_6h
            FROM ${articleTags} at
            JOIN ${tags} t ON t.id = at.tag_id
            JOIN ${articles} a ON a.id = at.article_id
            WHERE a.published_at > NOW() - INTERVAL '7 days'
              AND a.status = 'published'
            GROUP BY t.id
          )
          SELECT m6.name, m6.slug, m6.freq_6h AS mentions,
                 (m6.freq_6h / GREATEST(m7.avg_6h, 1.0)) AS trend_score
          FROM mentions_last_6h m6
          LEFT JOIN mentions_last_7d m7 ON m6.id = m7.id
          ORDER BY trend_score DESC, m6.freq_6h DESC
          LIMIT ${limit}
        `);
        return result.rows.map((r: any) => ({
          id: r.slug,
          name: r.name,
          slug: r.slug,
          mentions: Number(r.mentions),
          trendScore: Number(r.trend_score),
        }));
      }, 600);
      publicCache(res, 600);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch trending tags" });
    }
  });

  // Mount modular article router (handles trending, for-you, CRUD, related, similar, full-content, share)
  app.use("/api/articles", articleRouter);

  // ── Topic-Based Source Discovery ──
  app.get("/api/sources/:id", async (req, res) => {
    try {
      const article = await storage.getArticle(req.params.id);
      if (!article || !article.clusterId) {
        return res.json({ left: 0, center: 0, right: 0, total: 0, sources: [] });
      }
      
      const clusterArticles = await db
      .select({
        id: articles.id,
        title: articles.title,
        url: articles.url,
        publishedAt: articles.publishedAt,
        heroImageUrl: articles.heroImageUrl,
        sourceName: sql<string>`COALESCE(${publishers.name}, 
          REGEXP_REPLACE(${articles.url}, 'https?://(www\\.)?([^/]+).*', '\\2'),
          'Unknown Publisher')`,
        sourceUrl: publishers.website,
        bias: publishers.biasRating,
      })
      .from(articles)
      .leftJoin(publishers, eq(publishers.id, articles.sourceId))
      .where(
        and(
          eq(articles.clusterId, article.clusterId),
          eq(articles.status, 'published')
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(20);

    const left = clusterArticles.filter((a: any) => {
      const b = (a.bias || '').toLowerCase();
      return b.includes('pro_opposition') && !b.includes('pro_establishment');
    }).length;

    const right = clusterArticles.filter((a: any) => {
      const b = (a.bias || '').toLowerCase();
      return b.includes('pro_establishment') && !b.includes('pro_opposition');
    }).length;

    const center = clusterArticles.filter((a: any) => {
      const b = (a.bias || '').toLowerCase();
      return b === 'neutral' || b.includes('neutral') || 
             (!b.includes('pro_opposition') && !b.includes('pro_establishment') && b !== '');
    }).length;

    const clusterData = await db.select()
      .from(clusters)
      .where(eq(clusters.id, article.clusterId))
      .limit(1);

    return res.json({
      left: clusterData[0]?.proEstablishmentCount || left,
      center: clusterData[0]?.neutralCount || center,
      right: clusterData[0]?.proOppositionCount || right,
      total: clusterArticles.length,
      sources: clusterArticles,
    });
  } catch (err) {
      console.error('Sources error:', err);
      res.status(500).json({ left: 0, center: 0, right: 0, total: 0, sources: [] });
    }
  });

  app.get("/api/sources", optionalAuth, async (req, res) => {
    try {
      const articleId = req.query.articleId as string;
      if (!articleId) {
        return res.status(400).json({ error: "articleId is required" });
      }
      const result = await findSourcesForArticle(articleId);
      if (!result) {
        return res.status(404).json({ error: "Article not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Source discovery error:", error);
      res.status(500).json({ error: "Failed to discover sources" });
    }
  });

  // ==================== CLUSTERS ====================
  app.use("/api/clusters", clusterRouter);
  app.use("/api/social", socialRouter);
  app.use("/api/og", ogRouter);


  // ==================== BOOKMARKS ====================

  app.get("/api/bookmarks", authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      const bookmarks = await storage.getUserBookmarks(user.id);
      res.json(bookmarks);
    } catch (error) {
      console.error("Get bookmarks error:", error);
      res.status(500).json({ error: "Failed to get bookmarks" });
    }
  });

  app.post("/api/bookmarks", authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      const { articleId } = req.body;
      
      if (!articleId) {
        return res.status(400).json({ error: "Article ID is required" });
      }

      const bookmark = await storage.addBookmark({ userId: user.id, articleId });
      res.status(201).json(bookmark);
    } catch (error) {
      console.error("Add bookmark error:", error);
      res.status(500).json({ error: "Failed to add bookmark" });
    }
  });

  app.delete("/api/bookmarks/:articleId", authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      await storage.removeBookmark(user.id, req.params.articleId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove bookmark error:", error);
      res.status(500).json({ error: "Failed to remove bookmark" });
    }
  });

  // ==================== UPLOAD ====================

  app.post("/api/upload", authenticateUser, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ url: imageUrl });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // ==================== ANALYTICS ====================

  app.get("/api/analytics/views/:articleId", authenticateUser, async (req, res) => {
    try {
      const views = await storage.getArticleViews(req.params.articleId);
      res.json({ views });
    } catch (error) {
      console.error("Get views error:", error);
      res.status(500).json({ error: "Failed to get views" });
    }
  });

  // ==================== PERSONALIZATION ====================

  app.post("/api/interactions", authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      const { clusterId, action, durationMs } = req.body;
      
      if (!clusterId || !action) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const { trackUserInteraction } = await import("./personalization");
      await trackUserInteraction(user.id, clusterId, action, durationMs || 0);

      res.json({ success: true });
    } catch (error) {
      console.error("Track interaction error:", error);
      res.status(500).json({ error: "Failed to track interaction" });
    }
  });

  // ==================== THE LENS DISPATCH FEATURES ====================

  // Blindspot
  app.get("/api/blindspot", async (req, res) => {
    try {
      const result = await storage.getBlindspotArticles();
      publicCache(res);
      res.json(result);
    } catch (error) {
      console.error("Blindspot error:", error);
      res.status(500).json({ error: "Failed to get blindspot articles" });
    }
  });

  // Country Profile
  app.get("/api/country-profile", async (req, res) => {
    try {
      const code = (req.query.code as string) || "US";
      // Assuming getCountryProfile is imported, we should import it at the top or dynamically
      const { getCountryProfile } = await import("../shared/country-profiles/registry");
      const profile = getCountryProfile(code.toUpperCase());
      
      // Exclude internal scorerStrategyId
      const { scorerStrategyId, ...safeProfile } = profile;
      
      publicCache(res, 3600);
      res.json(safeProfile);
    } catch (error) {
      console.error("Country profile error:", error);
      res.status(500).json({ error: "Failed to get country profile" });
    }
  });

  // Dynamic Breaking News
  app.get("/api/stories/breaking", async (req, res) => {
    try {
      const market = (req.query.market as string) || "US";
      const limit = parseInt(req.query.limit as string) || 5;

      // Query clusters where phase is 'breaking', matching market
      const breakingClusters = await db.select({
        id: clusters.id,
        headline: clusters.headline,
        velocityScore: clusters.velocityScore,
        storyPhase: clusters.storyPhase
      })
      .from(clusters)
      .where(and(
        eq(clusters.storyPhase, "breaking"),
        sql`${clusters.primaryMarket} = ${market} OR ${clusters.multiMarket} ? ${market}`
      ))
      .orderBy(desc(clusters.velocityScore))
      .limit(limit);

      publicCache(res, 60);
      res.json(breakingClusters.map((c: any) => ({ id: c.id, text: c.headline, velocity: c.velocityScore })));
    } catch (error) {
      console.error("Breaking news error:", error);
      res.status(500).json({ error: "Failed to get breaking news" });
    }
  });

  // ==================== ADMIN PANEL ====================
  app.get("/api/admin/fetcher", authenticateUser, requireRole("admin"), (req, res) => {
    try {
      res.json(getAdminFetcherStatus());
    } catch (error) {
      console.error("Admin Fetch Status error:", error);
      res.status(500).json({ error: "Failed to get fetcher status" });
    }
  });

  app.post("/api/admin/fetcher", authenticateUser, requireRole("admin"), (req, res) => {
    try {
      const config = req.body;
      const updated = updateAdminFetcherConfig(config);
      res.json(updated);
    } catch (error) {
      console.error("Admin Update Fetcher error:", error);
      res.status(500).json({ error: "Failed to update fetcher config" });
    }
  });

  const addSourceSchema = z.object({
    url: z.string().url("Must be a valid URL"),
    publisherName: z.string().min(2, "Publisher name must be at least 2 characters").max(100),
    bias: z.enum(["pro_establishment", "pro_opposition", "neutral", "regional_aligned"]).optional(),
    country: z.string().length(2, "Country must be a 2-letter ISO code").optional(),
  });

  app.post("/api/admin/source", authenticateUser, requireRole("admin"), (req, res) => {
    try {
      const parseResult = addSourceSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).toString();
        return res.status(400).json({ error: errorMessage });
      }
      addCustomSource(parseResult.data);
      res.json({ success: true, status: getAdminFetcherStatus() });
    } catch (error) {
      console.error("Admin Add Source error:", error);
      res.status(500).json({ error: "Failed to add new RSS source" });
    }
  });

  // My News Bias
  app.get("/api/my-bias", authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      const stats = await storage.getMyNewsBias(user.id);
      res.json(stats);
    } catch (error) {
      console.error("My bias error:", error);
      res.status(500).json({ error: "Failed to get bias stats" });
    }
  });

  // Reading History
  app.get("/api/history", authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const history = await storage.getReadingHistory(user.id, limit);
      res.json(history);
    } catch (error) {
      console.error("History error:", error);
      res.status(500).json({ error: "Failed to get history" });
    }
  });

  // Note: /api/articles/:id/share is handled by articleRouter (article.routes.ts)

  // User Preferences
  app.get("/api/preferences", authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      const prefs = await storage.getUserPreferences(user.id);
      res.json(prefs || { userId: user.id, followedTopics: [], followedCategories: [], preferredBias: [], updatedAt: new Date() });
    } catch (error) {
      console.error("Get preferences error:", error);
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });

  app.put("/api/preferences", authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      const prefs = await storage.updateUserPreferences(user.id, req.body);
      res.json(prefs);
    } catch (error) {
      console.error("Update preferences error:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // ==================== SYSTEM SETTINGS ====================

  // GET is intentionally public — frontend needs settings for locale/topic config.
  // PATCH (below) is admin-only for mutations.
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", authenticateUser, requireRole("admin"), async (req, res) => {
    try {
      const data = insertSystemSettingsSchema.partial().parse(req.body);
      const updated = await storage.updateSystemSettings(data as any);
      res.json(updated);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update settings" });
      }
    }
  });

  // --- Debug Routes ---
  app.get("/api/debug/article/:id", authenticateUser, requireRole("admin"), async (req, res) => {
    try {
      const result = await db.select().from(articles).where(eq(articles.id, req.params.id)).limit(1);
      if (result.length === 0) return res.status(404).send("Article not found");
      res.json(result[0]);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  // --- Admin Fetcher Control ---
  app.post("/api/admin/fetcher/run", authenticateUser, requireRole("admin"), async (_req, res) => {
    try {
      console.log("[API] Manual fetch cycle triggered by admin.");
      const count = await fetchRealNews();
      res.json({ message: "Tiered fetch cycle completed", enqueued: count });
    } catch (error: any) {
      console.error("[API] Manual fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ── Admin Metrics Dashboard ──────────────────────────────────────────────
  app.get("/api/admin/metrics", authenticateUser, requireRole("admin"), async (req, res) => {
    const m = metrics;
    const uptimeMs = Date.now() - m.serverStartTime.getTime();

    const cycleTotal = m.currentCycle.length;
    const cycleOk = m.currentCycle.filter(s => s.status === "ok").length;
    const cycleFailed = m.currentCycle.filter(s => s.status === "failed").length;
    const cycleUnchanged = m.currentCycle.filter(s => s.status === "unchanged").length;

    const slowEndpoints = Object.entries(m.apiLatency)
      .map(([ep, v]) => ({ endpoint: ep, avgMs: Math.round(v.totalMs / v.count), count: v.count, errors: v.errors }))
      .sort((a, b) => b.avgMs - a.avgMs)
      .slice(0, 10);

    const activeErrors = m.errors.filter(e => !e.resolved);

    const queueDepth = await getQueueDepth();

    const topStoriesSrc = await storage.getHomepageClusters(10);
    const storyQuality = topStoriesSrc.map((s: any) => ({
      title: s.title?.substring(0, 60),
      sourceCount: s.sourceCount,
      velocityScore: s.velocityScore,
      bias: s.bias,
      storyPhase: s.storyPhase,
      proEstablishmentCount: s.proEstablishmentCount,
      proOppositionCount: s.proOppositionCount,
    }));

    res.json({
      uptime: { ms: uptimeMs, human: formatUptime(uptimeMs), serverStartTime: m.serverStartTime },
      fetch: {
        totalCycles: m.fetchCycleCount,
        lastStart: m.lastFetchStart,
        lastEnd: m.lastFetchEnd,
        currentCycle: { total: cycleTotal, ok: cycleOk, failed: cycleFailed, unchanged: cycleUnchanged },
        recentSources: m.recentFetches.slice(0, 50),
        currentSources: m.currentCycle,
      },
      worker: {
        total: m.workerTotal, success: m.workerSuccess, failed: m.workerFailed, duplicate: m.workerDuplicate,
        successRate: m.workerTotal > 0 ? Math.round((m.workerSuccess / m.workerTotal) * 100) : 0,
        recentJobs: m.recentJobs.slice(0, 50),
      },
      clustering: {
        matches: m.clusterMatches, newClusters: m.clusterNew, merges: m.clusterMerges,
        matchRate: (m.clusterMatches + m.clusterNew) > 0
          ? Math.round((m.clusterMatches / (m.clusterMatches + m.clusterNew)) * 100) : 0,
        recentEvents: m.recentClusters.slice(0, 50),
        scoreDistribution: (m as any).scoreDistribution || [],
      },
      api: {
        total: m.apiTotal, errors: m.apiErrors,
        errorRate: m.apiTotal > 0 ? Math.round((m.apiErrors / m.apiTotal) * 100) : 0,
        slowEndpoints, recentCalls: m.recentApiCalls.slice(0, 30),
      },
      schedulers: {
        lastVelocityRun: m.lastVelocityRun, lastReclusterRun: m.lastReclusterRun, lastEnrichmentRun: m.lastEnrichmentRun,
        recentRuns: m.schedulerRuns.slice(0, 20),
      },
      errors: {
        total: activeErrors.length, counts: m.errorCounts,
        active: activeErrors.slice(0, 100), all: m.errors.slice(0, 100),
      },
      process: {
        memoryMB: m.memoryMB,
        memoryHistory: m.memoryHistory,
      },
      queueDepth,
      storyQuality,
    });
  });

  app.post("/api/admin/metrics/resolve/:id", authenticateUser, requireRole("admin"), (req, res) => {
    resolveError(req.params.id);
    res.json({ ok: true });
  });

  app.delete("/api/admin/metrics/errors", authenticateUser, requireRole("admin"), (req, res) => {
    metrics.errors = [];
    metrics.errorCounts = { info: 0, warn: 0, critical: 0, perf: 0 };
    res.json({ ok: true });
  });

  // ══════════════════════════════════════════════════════════════════════
  // LOG QUERY API — LLM-friendly structured log access
  // ══════════════════════════════════════════════════════════════════════

  /** Query logs with filters. Admin only. */
  app.get("/api/admin/logs", authenticateUser, requireRole("admin"), async (req, res) => {
    try {
      const entries = await queryLogs({
        hours: parseInt(req.query.hours as string) || 6,
        level: (req.query.level as LogLevel) || undefined,
        source: (req.query.source as LogSource) || undefined,
        search: (req.query.search as string) || undefined,
        limit: parseInt(req.query.limit as string) || 200,
      });
      res.json({ count: entries.length, entries });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /** Structured summary of all log files. Admin only. */
  app.get("/api/admin/logs/summary", authenticateUser, requireRole("admin"), async (req, res) => {
    try {
      const files = await getLogFilesSummary();
      res.json({ files });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /** Export raw JSONL log file for LLM analysis. Admin only. */
  app.get("/api/admin/logs/export", authenticateUser, requireRole("admin"), async (req, res) => {
    try {
      const content = await exportCurrentSession();
      res.setHeader("Content-Type", "application/jsonl");
      res.setHeader("Content-Disposition", "attachment; filename=server-logs.jsonl");
      res.send(content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /** AI-friendly structured diagnosis report. Admin only. */
  app.get("/api/admin/logs/diagnosis", authenticateUser, requireRole("admin"), async (req, res) => {
    try {
      const diagnosis = await generateDiagnosis();
      res.json(diagnosis);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /** Client-side error ingestion (public — no auth required, rate-limited). */
  app.post("/api/logs/client", (req, res) => {
    try {
      const { errors } = req.body;
      if (!Array.isArray(errors) || errors.length === 0) {
        return res.status(400).json({ error: "errors array required" });
      }
      logClientError(errors.slice(0, 20)); // Max 20 per batch
      res.json({ received: errors.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
