import { Router } from "express";
import { authenticateUser, optionalAuth } from "../auth";
import { db } from "../db";
import { comments, commentVotes, communityRatings, users, userProfiles } from "../../shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";
import { storage } from "../storage";

const socialRouter = Router();

// GET /api/social/clusters/:id/comments
socialRouter.get("/clusters/:id/comments", optionalAuth, async (req, res) => {
  try {
    const clusterId = req.params.id;
    // Fetch comments and join with user profiles for display
    const clusterComments = await db
      .select({
        id: comments.id,
        content: comments.content,
        parentId: comments.parentId,
        upvotes: comments.upvotes,
        downvotes: comments.downvotes,
        createdAt: comments.createdAt,
        isAnonymous: comments.isAnonymous,
        user: {
          id: users.id,
          displayName: userProfiles.displayName,
          avatarUrl: userProfiles.avatarUrl,
        }
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(comments.clusterId, clusterId))
      .orderBy(desc(comments.upvotes), desc(comments.createdAt));

    // Mask user details if anonymous
    const sanitizedComments = clusterComments.map((c: Record<string, any>) => {
      if (c.isAnonymous) {
        c.user = { id: "", displayName: "Anonymous Reader", avatarUrl: null };
      }
      return c;
    });

    res.json(sanitizedComments);
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ error: "Failed to get comments" });
  }
});

// POST /api/social/clusters/:id/comments
socialRouter.post("/clusters/:id/comments", authenticateUser, async (req, res) => {
  try {
    const clusterId = req.params.id;
    const user = (req as any).user;
    
    const schema = z.object({
      content: z.string().min(1).max(2000),
      parentId: z.string().uuid().optional().nullable(),
      isAnonymous: z.boolean().default(false),
    });

    const parsed = schema.parse(req.body);

    const [newComment] = await db.insert(comments).values({
      clusterId,
      userId: user.id,
      content: parsed.content,
      parentId: parsed.parentId || null,
      isAnonymous: parsed.isAnonymous,
    }).returning();

    res.status(201).json(newComment);
  } catch (error: any) {
    console.error("Post comment error:", error);
    res.status(400).json({ error: error.message || "Failed to post comment" });
  }
});

// POST /api/social/comments/:id/vote
socialRouter.post("/comments/:id/vote", authenticateUser, async (req, res) => {
  try {
    const commentId = req.params.id;
    const user = (req as any).user;
    const { value } = z.object({ value: z.union([z.literal(1), z.literal(-1)]) }).parse(req.body);

    // Upsert vote
    await db.insert(commentVotes).values({
      commentId,
      userId: user.id,
      vote: value
    }).onConflictDoUpdate({
      target: [commentVotes.userId, commentVotes.commentId],
      set: { vote: value, createdAt: sql`NOW()` }
    });

    // Update denormalized counts on comment table
    // For extreme performance, we rely on the client to optimistically update, 
    // and periodically batch update actual counts. Here we do it inline for simplicity.
    const [{ up, down }] = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE vote = 1) as up,
        COUNT(*) FILTER (WHERE vote = -1) as down
      FROM ${commentVotes}
      WHERE comment_id = ${commentId}
    `);

    await db.update(comments)
      .set({ upvotes: Number(up), downvotes: Number(down) })
      .where(eq(comments.id, commentId));

    res.json({ success: true, upvotes: Number(up), downvotes: Number(down) });
  } catch (error: any) {
    console.error("Comment vote error:", error);
    res.status(400).json({ error: error.message || "Failed to record vote" });
  }
});

// POST /api/social/clusters/:id/rate
socialRouter.post("/clusters/:id/rate", authenticateUser, async (req, res) => {
  try {
    const clusterId = req.params.id;
    const user = (req as any).user;
    
    const schema = z.object({
      ratingType: z.enum(["bias", "factuality"]),
      ratingValue: z.string(),
    });

    const { ratingType, ratingValue } = schema.parse(req.body);

    await db.insert(communityRatings).values({
      clusterId,
      userId: user.id,
      ratingType,
      ratingValue,
    }).onConflictDoUpdate({
      target: [communityRatings.userId, communityRatings.clusterId, communityRatings.ratingType],
      set: { ratingValue, createdAt: sql`NOW()` }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Community rating error:", error);
    res.status(400).json({ error: error.message || "Failed to record rating" });
  }
});

// GET /api/social/profiles/:id
socialRouter.get("/profiles/:id", async (req, res) => {
  try {
    const targetUserId = req.params.id;
    
    // Fetch profile
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, targetUserId));
    
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Fetch bias stats if we want to show it publically (we can reuse storage.getMyNewsBias)
    const biasStats = await storage.getMyNewsBias(targetUserId);

    res.json({ profile, stats: biasStats });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

export { socialRouter };
