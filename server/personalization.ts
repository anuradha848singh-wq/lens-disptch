import { db } from "./db";
import { users, userInteractions, clusterCentroids, clusters, articles } from "../shared/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { calculateCosineSimilarity } from "../shared/schema";

/**
 * Tracks a user interaction with a cluster.
 * Valid actions: "click", "read", "upvote", "share"
 */
export async function trackUserInteraction(userId: string, clusterId: string, action: "click" | "read" | "upvote" | "share", durationMs: number = 0) {
  await db.insert(userInteractions).values({
    userId,
    clusterId,
    action,
    durationMs
  });

  // Recompute user vector on significant actions
  if (action === "read" && durationMs > 5000) {
    // Fire-and-forget vector update
    updateUserVector(userId).catch(err => console.error(`[Personalization] Failed to update vector for ${userId}:`, err));
  } else if (action === "upvote" || action === "share") {
    updateUserVector(userId).catch(err => console.error(`[Personalization] Failed to update vector for ${userId}:`, err));
  }
}

/**
 * Recomputes the user's 384-dimensional interest vector using an Exponential Moving Average (EMA).
 * This blends their historic vector with the vectors of recently read articles.
 * Also computes their bias distribution.
 */
export async function updateUserVector(userId: string) {
  // Get recent interactions (last 20 reads/upvotes)
  const recentInteractions = await db.select({
    clusterId: userInteractions.clusterId,
    action: userInteractions.action,
    durationMs: userInteractions.durationMs
  })
    .from(userInteractions)
    .where(eq(userInteractions.userId, userId))
    .orderBy(desc(userInteractions.createdAt))
    .limit(20);

  if (recentInteractions.length === 0) return;

  const clusterIds = [...new Set(recentInteractions.map(i => i.clusterId))];
  
  // Get centroids for these clusters
  const centroids = await db.select({
    clusterId: clusterCentroids.clusterId,
    centroid: clusterCentroids.centroid
  })
    .from(clusterCentroids)
    .where(inArray(clusterCentroids.clusterId, clusterIds));

  const centroidMap = new Map<string, number[]>();
  centroids.forEach(c => {
    let vec = c.centroid;
    if (typeof vec === 'string') {
      try { vec = JSON.parse(vec); } catch(e) {}
    }
    if (Array.isArray(vec)) centroidMap.set(c.clusterId!, vec);
  });

  // Calculate the average vector of recent reads, weighted by action type
  let newVector = new Array(384).fill(0);
  let totalWeight = 0;

  for (const interaction of recentInteractions) {
    const vec = centroidMap.get(interaction.clusterId);
    if (!vec) continue;

    let weight = 1.0;
    if (interaction.action === "upvote" || interaction.action === "share") weight = 3.0;
    else if (interaction.action === "read") {
      // Scale weight by read time, up to a max of 2.0 (e.g. 60 seconds)
      const seconds = Math.min((interaction.durationMs || 0) / 1000, 60);
      weight = 1.0 + (seconds / 60);
    }

    for (let i = 0; i < 384; i++) {
      newVector[i] += vec[i] * weight;
    }
    totalWeight += weight;
  }

  if (totalWeight > 0) {
    for (let i = 0; i < 384; i++) {
      newVector[i] = newVector[i] / totalWeight;
    }

    // Blend with existing vector (EMA)
    const userObj = await db.select({ interestVector: users.interestVector, biasProfile: users.biasProfile }).from(users).where(eq(users.id, userId)).limit(1);
    if (userObj.length > 0) {
      let existing = userObj[0].interestVector;
      if (typeof existing === 'string') {
        try { existing = JSON.parse(existing); } catch(e) {}
      }

      if (existing && Array.isArray(existing) && existing.length === 384) {
        // 70% existing, 30% new
        for (let i = 0; i < 384; i++) {
          newVector[i] = (existing[i] * 0.7) + (newVector[i] * 0.3);
        }
      }
    }

    // Normalize the final vector (Cosine similarity requires normalized vectors)
    let magnitude = 0;
    for (let i = 0; i < 384; i++) {
      magnitude += newVector[i] * newVector[i];
    }
    magnitude = Math.sqrt(magnitude);
    if (magnitude > 0) {
      for (let i = 0; i < 384; i++) {
        newVector[i] = newVector[i] / magnitude;
      }
    }

    // --- Compute Bias Profile ---
    // Fetch bias of articles inside those clusters
    const clusterArticles = await db.select({
      clusterId: articles.clusterId,
      biasLabel: sql<string>`trace->>'bias_tier'`
    })
      .from(articles)
      .where(and(
        inArray(articles.clusterId, clusterIds),
        sql`trace->>'bias_tier' IS NOT NULL`
      ));

    const biasCounts: Record<string, number> = {
      "pro_establishment": 0,
      "pro_establishment_2": 0,
      "pro_opposition": 0,
      "pro_opposition_2": 0,
      "neutral": 0,
      "AGGREGATORS": 0
    };

    clusterArticles.forEach(a => {
      if (a.biasLabel && biasCounts[a.biasLabel] !== undefined) {
        biasCounts[a.biasLabel]++;
      }
    });

    await db.update(users).set({
      interestVector: newVector,
      biasProfile: biasCounts
    }).where(eq(users.id, userId));
  }
}

/**
 * Generates the personalized feed for a user.
 * O(log n) HNSW search using their interest vector, with injected blindspot content.
 */
export async function generateAlgorithmicFeed(userId: string, limit: number = 20) {
  const userObj = await db.select({
    interestVector: users.interestVector,
    biasProfile: users.biasProfile
  }).from(users).where(eq(users.id, userId)).limit(1);

  if (userObj.length === 0) return null; // Fallback to chron feed

  const { interestVector, biasProfile } = userObj[0];

  let parsedVector: number[] | null = null;
  if (typeof interestVector === 'string') {
    try { parsedVector = JSON.parse(interestVector); } catch(e) {}
  } else if (Array.isArray(interestVector)) {
    parsedVector = interestVector;
  }

  // 1. If they have no vector, they get the standard feed
  if (!parsedVector || parsedVector.length !== 384) {
    return null;
  }

  // 3. Format vector for pgvector
  const vectorStr = `[${parsedVector.join(',')}]`;

  // 3. Do HNSW Nearest Neighbor search on cluster centroids!
  // We want recent clusters (last 24h) ordered by cosine distance (nearest first).
  // pgvector operator for cosine distance is <=>
  const recommendedQuery = await db.execute(sql`
    SELECT 
      c.id, 
      1 - (cc.centroid <=> ${vectorStr}::vector) as similarity,
      c.first_seen_at
    FROM clusters c
    JOIN cluster_centroids cc ON c.id = cc.cluster_id
    WHERE c.first_seen_at > NOW() - INTERVAL '24 hours'
    ORDER BY cc.centroid <=> ${vectorStr}::vector
    LIMIT ${limit * 2}
  `);

  const rawRecommended = recommendedQuery.rows as any[];
  
  // Sort by combination of similarity and recency
  // E.g., boost similarity if it's very fresh
  rawRecommended.forEach(r => {
    const ageHours = (Date.now() - new Date(r.first_seen_at).getTime()) / (1000 * 60 * 60);
    // Age penalty: decrease score by 0.01 per hour old
    r.finalScore = r.similarity - (ageHours * 0.005);
  });
  
  rawRecommended.sort((a, b) => b.finalScore - a.finalScore);
  const selectedClusterIds = rawRecommended.slice(0, limit).map(r => r.id);

  // 4. Echo Chamber Injection (Blindspots)
  // If user leans heavily to one side, inject 2 opposite clusters that have high semantic similarity to what they read!
  let blindspotTarget: string | null = null;
  const bias = (biasProfile || {}) as Record<string, number>;
  
  const leftReads = (bias["pro_opposition"] || 0) + (bias["pro_opposition_2"] || 0);
  const rightReads = (bias["pro_establishment"] || 0) + (bias["pro_establishment_2"] || 0);
  const totalReads = leftReads + rightReads + (bias["neutral"] || 0);

  if (totalReads > 10) {
    if (leftReads / totalReads > 0.6) blindspotTarget = "pro_establishment"; // Heavily Left -> Inject Right
    if (rightReads / totalReads > 0.6) blindspotTarget = "pro_opposition_2"; // Heavily Right -> Inject Left
  }

  if (blindspotTarget && selectedClusterIds.length > 0) {
    // Find clusters from the blindspot target that match their interest vector!
    const blindspotQuery = await db.execute(sql`
      SELECT 
        c.id, 
        1 - (cc.centroid <=> ${vectorStr}::vector) as similarity
      FROM clusters c
      JOIN cluster_centroids cc ON c.id = cc.cluster_id
      JOIN articles a ON a.cluster_id = c.id
      WHERE c.first_seen_at > NOW() - INTERVAL '48 hours'
        AND a.trace->>'bias_tier' = ${blindspotTarget}
        AND c.id NOT IN (SELECT unnest(ARRAY[${sql.join(selectedClusterIds.map(id => sql`${id}`), sql`,`)}]))
      GROUP BY c.id, cc.centroid
      ORDER BY cc.centroid <=> ${vectorStr}::vector
      LIMIT 2
    `);

    const blindspotIds = blindspotQuery.rows.map(r => r.id);
    // Inject at positions 3 and 7 (or random)
    if (blindspotIds.length > 0) {
      if (blindspotIds[0]) selectedClusterIds.splice(2, 0, blindspotIds[0] as string);
      if (blindspotIds[1]) selectedClusterIds.splice(6, 0, blindspotIds[1] as string);
    }
  }

  const finalIds = selectedClusterIds.slice(0, limit);
  if (finalIds.length === 0) return null;

  // Hydrate full cluster objects
  const { storage } = await import("./storage");
  // We can just fetch them all and sort them to match finalIds order
  const hydrated = await Promise.all(finalIds.map(async id => {
    return await storage.getCluster(id);
  }));

  // Map to the homepage format (with title, etc.)
  const formatted = hydrated.filter(Boolean).map((c: any) => ({
    id: c.id,
    title: c.headline,
    summary: c.summary,
    sourceCount: c.sourceCount,
    importanceScore: c.importanceScore,
    velocityScore: c.velocityScore,
    bias: c.biasLabel,
    storyPhase: c.storyPhase,
    proEstablishmentCount: c.proEstablishmentCount,
    proOppositionCount: c.proOppositionCount,
    regionalAlignedCount: c.regionalAlignedCount,
    neutralCount: c.neutralCount,
    lastUpdatedAt: c.lastUpdatedAt,
    category: c.categorySlug,
    aiSummary: c.aiSummary,
    blindspotScore: c.blindspotScore
  }));

  return formatted;
}
