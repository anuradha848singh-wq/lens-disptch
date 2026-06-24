import { Router } from "express";
import { storage } from "../storage";
import { authenticateUser, optionalAuth } from "../auth";
import { cache } from "../cache";
import { db } from "../db";
import { articles, articleCategories, categories } from "../../shared/schema";
import { eq, sql, and, desc, gte } from "drizzle-orm";

const analyticsRouter = Router();

analyticsRouter.get("/heat/:categorySlug", async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const days = Math.min(parseInt(req.query.days as string) || 365, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Handle 'all' as a global view, otherwise fetch category specifically
    let cat: any;
    if (categorySlug !== "all") {
      cat = await storage.getCategoryBySlug(categorySlug);
      if (!cat) return res.status(404).json({ error: "Category not found" });
    }

    const cacheKey = `analytics:heat:${categorySlug}:${days}`;
    const data = await cache.fetch(cacheKey, async () => {
      let result;
      if (categorySlug === "all") {
        // Global heat aggregation
        result = await db.execute(sql`
          SELECT 
            DATE(a.published_at) as day,
            COUNT(*) as count
          FROM ${articles} a
          WHERE a.published_at >= ${since}
            AND a.status = 'published'
          GROUP BY DATE(a.published_at)
          ORDER BY day ASC
        `);
      } else {
        // Category-specific heat aggregation
        result = await db.execute(sql`
          SELECT 
            DATE(a.published_at) as day,
            COUNT(*) as count
          FROM ${articles} a
          INNER JOIN ${articleCategories} ac ON ac.article_id = a.id
          WHERE ac.category_id = ${cat!.id}
            AND a.published_at >= ${since}
            AND a.status = 'published'
          GROUP BY DATE(a.published_at)
          ORDER BY day ASC
        `);
      }

      const dayMap = new Map<string, number>();
      for (const row of result.rows as any[]) {
        const dateStr = new Date(row.day).toISOString().split("T")[0];
        dayMap.set(dateStr, Number(row.count));
      }

      const allDays: { date: string; count: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        allDays.push({ date: key, count: dayMap.get(key) || 0 });
      }

      const maxCount = Math.max(...allDays.map(d => d.count), 1);

      return {
        category: categorySlug === "all" ? "Global" : cat!.name,
        days: allDays,
        maxCount,
      };
    }, 3600); // 1 hour cache

    res.json(data);
  } catch (err: any) {
    console.error("Heat calendar error:", err);
    res.status(500).json({ error: err.message });
  }
});

analyticsRouter.get("/sentiment/:categorySlug", async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const cat = await storage.getCategoryBySlug(categorySlug);
    if (!cat) return res.status(404).json({ error: "Category not found" });

    const cacheKey = `analytics:sentiment:${cat.id}:${days}`;
    const timeline = await cache.fetch(cacheKey, async () => {
      const result = await db.execute(sql`
        SELECT 
          a.title,
          DATE(a.published_at) as day
        FROM ${articles} a
        INNER JOIN ${articleCategories} ac ON ac.article_id = a.id
        WHERE ac.category_id = ${cat.id}
          AND a.published_at >= ${since}
          AND a.status = 'published'
        ORDER BY day ASC
      `);

      const ALARMING = ["crisis", "disaster", "danger", "threat", "attack", "death", "killed", "war", "emergency", "fatal", "shooting"];
      const TENSE = ["clash", "dispute", "warning", "protest", "fear", "drop", "cut", "failure", "tension", "criticism"];
      const HOPEFUL = ["breakthrough", "success", "growth", "win", "recover", "hope", "praise", "advance", "innovation", "peace", "deal"];
      const CALM = ["agreement", "stability", "sturdy", "smooth", "progress", "benefit", "secure", "steady"];

      const scoreHeadline = (title: string) => {
        const t = title.toLowerCase();
        let score = 0;
        ALARMING.forEach(w => { if(t.includes(w)) score -= 2; });
        TENSE.forEach(w => { if(t.includes(w)) score -= 1; });
        HOPEFUL.forEach(w => { if(t.includes(w)) score += 2; });
        CALM.forEach(w => { if(t.includes(w)) score += 1; });
        return score;
      };

      const dataByDay = new Map<string, any>();
      for (const row of result.rows as any[]) {
        const dateStr = new Date(row.day).toISOString().split("T")[0];
        if (!dataByDay.has(dateStr)) {
          dataByDay.set(dateStr, { alarming: 0, tense: 0, neutral: 0, calm: 0, hopeful: 0 });
        }
        const score = scoreHeadline(row.title);
        const dayData = dataByDay.get(dateStr);
        if (score <= -2) dayData.alarming++;
        else if (score === -1) dayData.tense++;
        else if (score >= 2) dayData.hopeful++;
        else if (score === 1) dayData.calm++;
        else dayData.neutral++;
      }

      const timelineData = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        timelineData.push({
          date: key,
          ...(dataByDay.get(key) || { alarming: 0, tense: 0, neutral: 0, calm: 0, hopeful: 0 })
        });
      }
      return timelineData;
    }, 1800); // 30 min cache

    res.json(timeline);
  } catch (err: any) {
    console.error("Sentiment river error:", err);
    res.status(500).json({ error: err.message });
  }
});

analyticsRouter.get("/droughts", async (req, res) => {
  try {
    const cacheKey = "analytics:droughts";
    const data = await cache.fetch(cacheKey, async () => {
      const cats = await storage.listCategories();
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const droughts = [];
      for (const cat of cats) {
        // Count in last 24h
        const [count24h] = await db.select({ val: sql<number>`count(*)` })
          .from(articles)
          .innerJoin(articleCategories, eq(articles.id, articleCategories.articleId))
          .where(and(eq(articleCategories.categoryId, cat.id), gte(articles.publishedAt, last24h)));
        
        // Historical daily average (count in last 7 days / 7)
        const [count7d] = await db.select({ val: sql<number>`count(*)` })
          .from(articles)
          .innerJoin(articleCategories, eq(articles.id, articleCategories.articleId))
          .where(and(eq(articleCategories.categoryId, cat.id), gte(articles.publishedAt, last7d)));

        const avgDaily = Number(count7d.val) / 7;
        const current = Number(count24h.val);
        
        if (avgDaily > 1 && current < (avgDaily * 0.3)) {
          const [lastArt] = await db.select({ publishedAt: articles.publishedAt })
            .from(articles)
            .innerJoin(articleCategories, eq(articles.id, articleCategories.articleId))
            .where(eq(articleCategories.categoryId, cat.id))
            .orderBy(desc(articles.publishedAt))
            .limit(1);

          const hoursSince = lastArt ? Math.floor((now.getTime() - lastArt.publishedAt!.getTime()) / 3600000) : 72;
          
          droughts.push({
            category: cat.name,
            slug: cat.slug,
            hoursSinceLast: hoursSince,
            severity: hoursSince > 36 ? "high" : "medium"
          });
        }
      }
      return droughts;
    }, 600);

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { analyticsRouter };
