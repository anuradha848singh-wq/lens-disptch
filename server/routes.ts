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
  insertCategorySchema, insertTagSchema, insertArticleSchema,
  insertSystemSettingsSchema
} from "@shared/schema";
import { fetchFullContent } from "./article-scraper";
import { findSourcesForArticle } from "./topic-search";

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

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ==================== AUTH ====================

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, displayName } = req.body;

      if (!email || !password || !displayName) {
        return res.status(400).json({ error: "Email, password, and display name are required" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);
      const { user, profile } = await storage.createUser(
        { email, passwordHash, role: "editor", status: "active" },
        { userId: "", displayName, avatarUrl: null, bio: null }
      );

      const token = await generateSessionToken();
      const tokenHash = await hashPassword(token);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const session = await storage.createSession({
        userId: user.id,
        refreshTokenHash: tokenHash,
        expiresAt,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
      });

      res.cookie('session_id', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ user: { ...user, passwordHash: undefined }, profile });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.status !== "active") {
        return res.status(403).json({ error: "Account is not active" });
      }

      const token = await generateSessionToken();
      const tokenHash = await hashPassword(token);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const session = await storage.createSession({
        userId: user.id,
        refreshTokenHash: tokenHash,
        expiresAt,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
      });

      res.cookie('session_id', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const profile = await storage.getUserProfile(user.id);
      res.json({ user: { ...user, passwordHash: undefined }, profile });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", authenticateUser, async (req, res) => {
    try {
      const sessionId = (req as any).sessionId;
      if (sessionId) {
        await storage.deleteSession(sessionId);
      }
      res.clearCookie('session_id');
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  app.get("/api/auth/me", authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      const profile = await storage.getUserProfile(user.id);
      res.json({ user: { ...user, passwordHash: undefined }, profile });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // ==================== PUBLISHERS ====================

  app.get("/api/publishers", async (req, res) => {
    try {
      const publishers = await storage.listPublishers();
      res.json(publishers);
    } catch (error) {
      console.error("List publishers error:", error);
      res.status(500).json({ error: "Failed to list publishers" });
    }
  });

  app.get("/api/publishers/:id", async (req, res) => {
    try {
      const publisher = await storage.getPublisher(req.params.id);
      if (!publisher) {
        return res.status(404).json({ error: "Publisher not found" });
      }
      res.json(publisher);
    } catch (error) {
      console.error("Get publisher error:", error);
      res.status(500).json({ error: "Failed to get publisher" });
    }
  });

  app.post("/api/publishers", authenticateUser, requireRole("admin"), async (req, res) => {
    try {
      const data = insertPublisherSchema.parse(req.body);
      const publisher = await storage.createPublisher(data);
      res.status(201).json(publisher);
    } catch (error: any) {
      console.error("Create publisher error:", error);
      res.status(400).json({ error: error.message || "Failed to create publisher" });
    }
  });

  app.patch("/api/publishers/:id", authenticateUser, requireRole("admin"), async (req, res) => {
    try {
      const publisher = await storage.updatePublisher(req.params.id, req.body);
      res.json(publisher);
    } catch (error: any) {
      console.error("Update publisher error:", error);
      res.status(400).json({ error: error.message || "Failed to update publisher" });
    }
  });

  app.delete("/api/publishers/:id", authenticateUser, requireRole("admin"), async (req, res) => {
    try {
      await storage.deletePublisher(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete publisher error:", error);
      res.status(400).json({ error: error.message || "Failed to delete publisher" });
    }
  });

  // ==================== CATEGORIES & TAGS ====================

  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.listCategories();
      res.json(categories);
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

  // ==================== ARTICLES ====================

  // IMPORTANT: /api/articles/trending and /api/articles/for-you MUST be before /api/articles/:id
  app.get("/api/force-fetch", async (req, res) => {
    try {
      const { fetchRealNews } = await import("./news-fetcher");
      const count = await fetchRealNews();
      res.json({ success: true, count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/articles/trending", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const articles = await storage.getTrendingArticles(limit);
      res.json(articles);
    } catch (error) {
      console.error("Trending articles error:", error);
      res.status(500).json({ error: "Failed to get trending articles" });
    }
  });

  app.get("/api/articles/for-you", authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const articles = await storage.getForYouArticles(user.id, limit);
      res.json(articles);
    } catch (error) {
      console.error("For-you articles error:", error);
      res.status(500).json({ error: "Failed to get personalized articles" });
    }
  });

  app.get("/api/articles", optionalAuth, async (req, res) => {
    try {
      const { status, category, bias, search, limit, offset } = req.query;
      const user = (req as any).user;
      
      const params: any = {
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      };

      if (status && !user) {
        params.status = "published";
      } else if (status) {
        params.status = status as any;
      } else if (!user || user.role !== "admin") {
        params.status = "published";
      }

      if (category) params.categoryId = category as string;
      if (bias) params.bias = bias as any;
      if (search) params.search = search as string;

      const result = await storage.listArticles(params);
      res.json(result);
    } catch (error) {
      console.error("List articles error:", error);
      res.status(500).json({ error: "Failed to list articles" });
    }
  });

  app.get("/api/articles/:id/full-content", optionalAuth, async (req, res) => {
    try {
      const article = await storage.getArticle(req.params.id);
      if (!article) return res.status(404).json({ error: "Article not found" });

      if (article.fullContent) {
        return res.json({ fullContent: article.fullContent });
      }

      if (!article.sourceUrl) {
        return res.status(400).json({ error: "No source URL available for scraping" });
      }

      console.log(`[scraper] Fetching full content for: ${article.sourceUrl}`);
      const scraped = await fetchFullContent(article.sourceUrl);
      
      if (scraped && scraped.bodyHtml) {
        await storage.updateArticleContent(article.id, scraped.bodyHtml);
        // Also update the 'fullContent' field specifically if we want to separate it
        // For now, I'll update the main bodyHtml and also return it
        res.json({ fullContent: scraped.bodyHtml });
      } else {
        res.status(500).json({ error: "Failed to extract content from source" });
      }
    } catch (error) {
      console.error("Scrape error:", error);
      res.status(500).json({ error: "Scraping failed" });
    }
  });

  app.get("/api/articles/:id", optionalAuth, async (req, res) => {
    try {
      const article = await storage.getArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      const user = (req as any).user;
      if (article.status !== "published" && (!user || (user.id !== article.authorId && user.role !== "admin"))) {
        return res.status(404).json({ error: "Article not found" });
      }

      // Track view
      await storage.trackArticleView({
        articleId: article.id,
        viewerId: user?.id || null,
        referrer: req.headers.referer || null,
        metadata: null,
      });

      // Track reading history for logged-in users
      if (user) {
        await storage.trackReadingHistory(user.id, article.id);
      }

      res.json(article);
    } catch (error) {
      console.error("Get article error:", error);
      res.status(500).json({ error: "Failed to get article" });
    }
  });

  app.get("/api/articles/:id/related", optionalAuth, async (req, res) => {
    try {
      const related = await storage.getRelatedArticles(req.params.id);
      res.json(related);
    } catch (error) {
      console.error("Get related articles error:", error);
      res.status(500).json({ error: "Failed to get related articles" });
    }
  });

  // ── Topic-Based Source Discovery (the Ground News killer feature) ──
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

  app.post("/api/articles", authenticateUser, async (req, res) => {
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

  app.patch("/api/articles/:id", authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      const article = await storage.getArticle(req.params.id);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      if (user.role !== "admin" && article.authorId !== user.id) {
        return res.status(403).json({ error: "Not authorized to edit this article" });
      }

      const { categoryIds, tagIds, ...updateData } = req.body;
      const updated = await storage.updateArticle(req.params.id, updateData, categoryIds, tagIds);
      res.json(updated);
    } catch (error: any) {
      console.error("Update article error:", error);
      res.status(400).json({ error: error.message || "Failed to update article" });
    }
  });

  app.post("/api/articles/:id/publish", authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      const article = await storage.getArticle(req.params.id);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      if (user.role !== "admin" && article.authorId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const published = await storage.publishArticle(req.params.id);
      res.json(published);
    } catch (error: any) {
      console.error("Publish article error:", error);
      res.status(400).json({ error: error.message || "Failed to publish article" });
    }
  });

  app.delete("/api/articles/:id", authenticateUser, async (req, res) => {
    try {
      const user = (req as any).user;
      const article = await storage.getArticle(req.params.id);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      if (user.role !== "admin" && article.authorId !== user.id) {
        return res.status(403).json({ error: "Not authorized to delete this article" });
      }

      await storage.deleteArticle(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete article error:", error);
      res.status(400).json({ error: error.message || "Failed to delete article" });
    }
  });

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

  // ==================== GROUND NEWS FEATURES ====================

  // Blindspot
  app.get("/api/blindspot", async (req, res) => {
    try {
      const result = await storage.getBlindspotArticles();
      res.json(result);
    } catch (error) {
      console.error("Blindspot error:", error);
      res.status(500).json({ error: "Failed to get blindspot articles" });
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
      res.status(500).json({ error: "Failed to get reading history" });
    }
  });

  // Share tracking
  app.post("/api/articles/:id/share", optionalAuth, async (req, res) => {
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

  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", authenticateUser, async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
