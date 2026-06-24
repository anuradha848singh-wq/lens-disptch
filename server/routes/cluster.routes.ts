import { Router } from "express";
import { storage } from "../storage";
import { authenticateUser, optionalAuth } from "../auth";
import { cache } from "../cache";
import { db } from "../db";
import { articles, clusters, publishers } from "../../shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { deriveBiasLabel } from "../routes";

const clusterRouter = Router();

// Public API middleware for caching
const publicCache = (res: any, ttl = 300) => {
  res.setHeader("Cache-Control", `public, s-maxage=${ttl}, stale-while-revalidate=${Math.round(ttl / 5)}`);
};

clusterRouter.get("/", async (req, res) => {
  publicCache(res);
  try {
    const allClusters = await storage.listClusters();
    res.json(allClusters);
  } catch (error) {
    console.error("List clusters error:", error);
    res.status(500).json({ error: "Failed to list clusters" });
  }
});

clusterRouter.get("/:id", optionalAuth, async (req, res) => {
  try {
    const cluster = await storage.getCluster(req.params.id);
    if (!cluster) return res.status(404).json({ error: "Cluster not found" });

    const gaps: string[] = [];
    if (cluster.proEstablishmentCount === 0 && cluster.proOppositionCount > 0) gaps.push("pro_opposition");
    if (cluster.proOppositionCount === 0 && cluster.proEstablishmentCount > 0) gaps.push("pro_establishment");
    if (cluster.neutralCount === 0 && (cluster.proEstablishmentCount > 0 || cluster.proOppositionCount > 0)) gaps.push("neutral");

    const enrichedCluster = {
      ...cluster,
      coverage_gaps: gaps,
      blindspotMessage: gaps.length > 0 
        ? `${gaps.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(" & ")}-leaning sources are currently ignoring this story.` 
        : null
    };

    publicCache(res);
    res.json(enrichedCluster);
  } catch (error) {
    console.error("Get cluster error:", error);
    res.status(500).json({ error: "Failed to get cluster" });
  }
});

clusterRouter.get("/:id/deep", async (req, res) => {
  try {
    const clusterId = req.params.id;
    const data = await cache.fetch(`cluster:deep:${clusterId}`, async () => {
      const cluster = await storage.getCluster(clusterId);
      if (!cluster) return null;

      // Fetch all published articles in cluster for analysis
      const { articles: clusterArticles } = await storage.listArticles({ clusterId, status: "published", limit: 100 });

      // Identify Origin Source
      let originSource = null;
      if (cluster.originPublisherId) {
        originSource = await storage.getPublisher(cluster.originPublisherId);
      } else if (clusterArticles.length > 0) {
        // Fallback: earliest article is origin
        const sorted = [...clusterArticles].sort((a,b) => 
          new Date(a.publishedAt || 0).getTime() - new Date(b.publishedAt || 0).getTime()
        );
        originSource = sorted[0]?.publisher;
      }

      return {
        id: cluster.id,
        headline: cluster.headline,
        summary: cluster.summary,
        origin: {
          publisher: originSource,
          publishedAt: cluster.originPublishedAt || (clusterArticles.length > 0 ? clusterArticles[0].publishedAt : null)
        },
        intelligence: {
          sdi: cluster.shannonDiversity || 0,
          geography: (cluster.geographyAggs as any) || {},
          sourceCount: cluster.sourceCount || clusterArticles.length,
          blindspotScore: cluster.blindspotScore || 0,
          blindspotSide: cluster.blindspotSide
        },
        articles: clusterArticles
      };
    }, 300);

    if (!data) return res.status(404).json({ error: "Cluster not found" });

    res.json(data);
  } catch (error) {
    console.error("Deep analytical dive failed:", error);
    res.status(500).json({ error: "Failed to perform deep analytical dive" });
  }
});

clusterRouter.patch("/:id", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin" && user.role !== "editor") {
      return res.status(403).json({ error: "Not authorized to modify clusters" });
    }

    const updated = await storage.updateCluster(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error("Update cluster error:", error);
    res.status(400).json({ error: error.message || "Failed to update cluster" });
  }
});

clusterRouter.get("/:id/compare", optionalAuth, async (req, res) => {
  try {
    const { articles: clusterArticles } = await storage.listArticles({ 
      clusterId: req.params.id,
      limit: 50,
      status: "published"
    });

    const grouped = {
      pro_establishment: clusterArticles.filter((a: any) => a.publisher?.biasRating === "pro_establishment"),  
      pro_opposition: clusterArticles.filter((a: any) => a.publisher?.biasRating === "pro_opposition"),
      neutral: clusterArticles.filter((a: any) => ["regional_aligned", "neutral"].includes(a.publisher?.biasRating || "neutral")),
    };

    res.json(grouped);
  } catch (error) {
    console.error("Cluster compare error:", error);
    res.status(500).json({ error: "Failed to get cluster comparison" });
  }
});

clusterRouter.get("/:id/timeline", optionalAuth, async (req, res) => {
  try {
    const { articles: clusterArticles } = await storage.listArticles({ 
      clusterId: req.params.id,
      limit: 100,
      status: "published"
    });

    const timeline = clusterArticles
      .sort((a: any, b: any) => {
        const timeA = new Date(a.publishedAt || a.createdAt).getTime();
        const timeB = new Date(b.publishedAt || b.createdAt).getTime();
        return timeA - timeB;
      }); 

    // NEW TIME-WINDOW CLUSTERING: Grouping timeline events into chronological milestones.
    // Helps solve the "JUST NOW" spam by only showing a new plot point if coverage 
    // significantly shifts more than 2 hours later.
    const groupedTimeline = [];
    let lastTime = 0;
    const WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hour window

    for (const a of timeline) {
      const time = new Date(a.publishedAt || a.createdAt).getTime();
      // Always track the first report, then only plot if the next event is > 2h later.
      if (groupedTimeline.length === 0 || (time - lastTime >= WINDOW_MS)) {
        groupedTimeline.push(a);
        lastTime = time;
      }
    }

    res.json(groupedTimeline);
  } catch (error) {
    console.error("Cluster timeline error:", error);
    res.status(500).json({ error: "Failed to get cluster timeline" });
  }
});

clusterRouter.get("/:id/impact", async (req, res) => {
  try {
    const clusterId = req.params.id;
    const cluster = await storage.getCluster(clusterId);
    if (!cluster) return res.status(404).json({ error: "Cluster not found" });

    const clusterArticles = await db.select({
      id: articles.id,
      importanceScore: articles.importanceScore,
      sourceId: articles.sourceId,
      biasScore: articles.biasScore,
      publisher: publishers
    })
    .from(articles)
    .innerJoin(publishers, eq(articles.sourceId, publishers.id))
    .where(eq(articles.clusterId, clusterId));

    const reach = Math.min(100, (cluster.sourceCount * 12));
    const velocity = cluster.velocityScore || 0;
    const depth = Math.min(100, (clusterArticles.length * 8));

    res.json({
      reach,      // 0-100: geographic/source breadth
      velocity,   // 0-100: speed of coverage
      depth,      // 0-100: depth of analysis/follow-ups
      sourceCount: cluster.sourceCount,
      category: cluster.categorySlug || "news",
    });
  } catch (err: any) {
    console.error("Impact rings error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Premium Feature Endpoints (FLAN-T5 Powered) ───────────────────────────

clusterRouter.get("/:id/foreign-gaze", async (req, res) => {
  try {
    const cluster = await storage.getCluster(req.params.id);
    if (!cluster) return res.status(404).json({ error: "Cluster not found" });
    const data = (cluster as any).aiForeignGaze || null;
    if (!data) return res.json({ available: false, message: "Foreign gaze analysis not yet available for this cluster." });
    publicCache(res, 600);
    res.json({ available: true, ...data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clusterRouter.get("/:id/briefing", async (req, res) => {
  try {
    const cluster = await storage.getCluster(req.params.id);
    if (!cluster) return res.status(404).json({ error: "Cluster not found" });
    const data = (cluster as any).aiExecutiveBriefing || null;
    if (!data) return res.json({ available: false, message: "Executive briefing requires 10+ sources." });
    publicCache(res, 600);
    res.json({ available: true, ...data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clusterRouter.get("/:id/entities", async (req, res) => {
  try {
    const cluster = await storage.getCluster(req.params.id);
    if (!cluster) return res.status(404).json({ error: "Cluster not found" });
    const data = (cluster as any).aiEntityQuotes || [];
    publicCache(res, 600);
    res.json({ quotes: data, count: data.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clusterRouter.get("/:id/market-impact", async (req, res) => {
  try {
    const cluster = await storage.getCluster(req.params.id);
    if (!cluster) return res.status(404).json({ error: "Cluster not found" });
    const data = (cluster as any).aiMarketTickers || null;
    if (!data) return res.json({ available: false, tickers: [] });
    publicCache(res, 600);
    res.json({ available: true, ...data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { clusterRouter };
