import { Router } from "express";
import { storage } from "../storage";
import { hashPassword, verifyPassword, generateSessionToken, authenticateUser } from "../auth";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = loginSchema.extend({
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
});

function sanitizeUser(user: any) {
  const { passwordHash, ...safe } = user;
  return safe;
}

const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: fromZodError(validation.error).message });
    }
    const { email, password, displayName } = validation.data;

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
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: sanitizeUser(user), profile });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: fromZodError(validation.error).message });
    }
    const { email, password } = validation.data;

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
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const profile = await storage.getUserProfile(user.id);
    res.json({ user: sanitizeUser(user), profile });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

authRouter.post("/logout", authenticateUser, async (req, res) => {
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

export { authRouter };
