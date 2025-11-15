import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { UserRole } from "@shared/schema";

const SALT_ROUNDS = 10;
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateSessionToken(): Promise<string> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.cookies?.session_id;
    
    if (!sessionId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const session = await storage.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: "Invalid session" });
    }

    if (session.expiresAt < new Date()) {
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
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.session_id;
  
  if (!sessionId) {
    return next();
  }

  storage.getSession(sessionId).then(session => {
    if (session && session.expiresAt >= new Date()) {
      storage.getUser(session.userId).then(user => {
        if (user && user.status === "active") {
          (req as any).user = user;
          (req as any).sessionId = sessionId;
        }
        next();
      }).catch(() => next());
    } else {
      next();
    }
  }).catch(() => next());
}
