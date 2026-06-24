import { Router } from "express";
import { storage } from "../storage";
import { authenticateUser, requireRole } from "../auth";
import { insertPublisherSchema } from "../../shared/schema";
import { cache } from "../cache";
import { db } from "../db";
import { articles } from "../../shared/schema";
import { eq, and, gte } from "drizzle-orm";

const publisherRouter = Router();

publisherRouter.get("/", async (_req, res) => {
  res.setHeader("Cache-Control", `public, s-maxage=300, stale-while-revalidate=60`);
  try {
    const allPublishers = await storage.listPublishers();
    res.json(allPublishers);
  } catch (error) {
    console.error("List publishers error:", error);
    res.status(500).json({ error: "Failed to list publishers" });
  }
});

publisherRouter.get("/:id", async (req, res) => {
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

publisherRouter.get("/:id/articles", async (req, res) => {
  try {
    const publisherId = req.params.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const result = await storage.listArticles({ 
      sourceId: publisherId, 
      limit: Math.min(limit, 50), // cap at 50 to prevent abuse
      status: "published",
    });
    res.json(result);
  } catch (error) {
    console.error("Get publisher articles error:", error);
    res.status(500).json({ error: "Failed to get publisher articles" });
  }
});

publisherRouter.post("/", authenticateUser, requireRole("admin"), async (req, res) => {
  try {
    const data = insertPublisherSchema.parse(req.body);
    const publisher = await storage.createPublisher(data);
    res.status(201).json(publisher);
  } catch (error: any) {
    console.error("Create publisher error:", error);
    res.status(400).json({ error: error.message || "Failed to create publisher" });
  }
});

publisherRouter.patch("/:id", authenticateUser, requireRole("admin"), async (req, res) => {
  try {
    const publisher = await storage.updatePublisher(req.params.id, req.body);
    res.json(publisher);
  } catch (error: any) {
    console.error("Update publisher error:", error);
    res.status(400).json({ error: error.message || "Failed to update publisher" });
  }
});

publisherRouter.delete("/:id", authenticateUser, requireRole("admin"), async (req, res) => {
  try {
    await storage.deletePublisher(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete publisher error:", error);
    res.status(400).json({ error: error.message || "Failed to delete publisher" });
  }
});

publisherRouter.get("/:id/radar", async (req, res) => {
  try {
    const pub = await storage.getPublisher(req.params.id);
    if (!pub) return res.status(404).json({ error: "Publisher not found" });

    const cacheKey = `publisher:radar:${pub.id}`;
    const data = await cache.fetch(cacheKey, async () => {
      return {
        reliability: pub.reliabilityScore || 70,
        uniqueness: pub.uniquenessScore || 50,
        consistency: pub.consistencyScore || 75,
        correction: 100 - (pub.correctionRate || 0) * 8, // scaled penalty
        transparency: pub.ownerName ? 90 : 45, // proxy based on ownership data
      };
    }, 3600);

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

publisherRouter.get("/:id/fingerprint", async (req, res) => {
  try {
    const pubId = req.params.id;
    const pub = await storage.getPublisher(pubId);
    if (!pub) return res.status(404).json({ error: "Publisher not found" });

    const cacheKey = `publisher:fingerprint:${pubId}`;
    const data = await cache.fetch(cacheKey, async () => {
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await db.select({ title: articles.title })
        .from(articles)
        .where(and(eq(articles.sourceId, pubId), gte(articles.publishedAt, last30Days)));

      const scores = { alarming: 0, tense: 0, neutral: 0, calm: 0, hopeful: 0 };
      
      const ALARMING = ["crisis", "disaster", "danger", "threat", "attack", "death", "killed", "war", "emergency", "fatal", "shooting"];
      const TENSE = ["clash", "dispute", "warning", "protest", "fear", "drop", "cut", "failure", "tension", "criticism"];
      const HOPEFUL = ["breakthrough", "success", "growth", "win", "recover", "hope", "praise", "advance", "innovation", "peace", "deal"];
      const CALM = ["agreement", "stability", "sturdy", "smooth", "progress", "benefit", "secure", "steady"];

      result.forEach((row: any) => {
        const t = row.title!.toLowerCase();
        let s = 0;
        ALARMING.forEach(w => { if(t.includes(w)) s -= 2; });
        TENSE.forEach(w => { if(t.includes(w)) s -= 1; });
        HOPEFUL.forEach(w => { if(t.includes(w)) s += 2; });
        CALM.forEach(w => { if(t.includes(w)) s += 1; });

        if (s <= -2) scores.alarming++;
        else if (s === -1) scores.tense++;
        else if (s >= 2) scores.hopeful++;
        else if (s === 1) scores.calm++;
        else scores.neutral++;
      });

      return { ...scores, total: result.length };
    }, 7200);

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { publisherRouter };
