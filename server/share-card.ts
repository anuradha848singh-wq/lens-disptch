/**
 * Share Card Generation Endpoint
 * 
 * Generates OG image / share card for clusters:
 * - GET /api/clusters/:id/share-card
 * - Returns PNG image with headline + bias coverage meter
 */

import { Router } from "express";
import { db } from "./db";
import { clusters, articles, publishers } from "../shared/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// Note: This would need satori + sharp installed
// For now, this returns a data URL placeholder that can be generated client-side
// In production, use: npm install satori sharp

router.get("/clusters/:id/share-card", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get cluster data
    const [cluster] = await db
      .select()
      .from(clusters)
      .where(eq(clusters.id, id));
    
    if (!cluster) {
      res.status(404).json({ error: "Cluster not found" });
      return;
    }
    
    // Get headline and bias counts
    const headline = cluster.headline || "News Coverage";
    const counts = {
      proEstablishment: cluster.proEstablishmentCount || 0,
      proOpposition: cluster.proOppositionCount || 0,
      regionalAligned: cluster.regionalAlignedCount || 0,
      neutral: cluster.neutralCount || 0,
    };
    const total = counts.proEstablishment + counts.proOpposition + counts.regionalAligned + counts.neutral;
    
    // Generate share card data
    // In production, this would use satori to generate actual PNG
    const shareCardData = {
      headline: headline.substring(0, 100) + (headline.length > 100 ? "..." : ""),
      sourceCount: cluster.sourceCount || total,
      biasDistribution: {
        left: total > 0 ? Math.round((counts.proEstablishment / total) * 100) : 0,
        center: total > 0 ? Math.round((counts.neutral / total) * 100) : 0,
        right: total > 0 ? Math.round((counts.proOpposition / total) * 100) : 0,
      },
      generatedAt: new Date().toISOString(),
      // Placeholder for actual image - client can render using canvas
      placeholder: true,
    };
    
    // Return share card metadata
    // Frontend can render this using canvas or use a library like html-to-image
    res.json(shareCardData);
  } catch (error) {
    console.error("Error generating share card:", error);
    res.status(500).json({ error: "Failed to generate share card" });
  }
});

export default router;