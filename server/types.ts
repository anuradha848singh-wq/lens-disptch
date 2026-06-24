import type { Request } from "express";
import type { User } from "../shared/schema";

/**
 * Typed Express request extensions for authenticated routes.
 * Eliminates all `(req as any).user` casts throughout the codebase.
 */
export interface AuthenticatedRequest extends Request {
  user: User;
  sessionId: string;
}

export interface OptionalAuthRequest extends Request {
  user?: User;
  sessionId?: string;
}
