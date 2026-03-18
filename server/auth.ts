import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateSessionToken(): Promise<string> {
  return randomBytes(32).toString("hex");
}

export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.cookies?.session_id;
    if (!sessionId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const session = await storage.getSession(sessionId);
    if (!session) {
      return res.status(401).json({ error: "Session not found" });
    }

    if (new Date() > session.expiresAt) {
      await storage.deleteSession(sessionId);
      return res.status(401).json({ error: "Session expired" });
    }

    const user = await storage.getUser(session.userId);
    if (!user || user.status !== "active") {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    (req as any).user = user;
    (req as any).sessionId = sessionId;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Authentication error" });
  }
}

export function requireRole(role: "admin" | "editor") {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (role === "admin" && user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.cookies?.session_id;
    if (!sessionId) return next();

    const session = await storage.getSession(sessionId);
    if (!session || new Date() > session.expiresAt) return next();

    const user = await storage.getUser(session.userId);
    if (user && user.status === "active") {
      (req as any).user = user;
      (req as any).sessionId = sessionId;
    }
    next();
  } catch {
    next();
  }
}
