import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { storage } from "./storage";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import crypto from "crypto";
import compression from "compression";
import {
  logInfo, logError, logCritical, logApiRequest,
  requestContext, shutdownLogger
} from "./logger";

const app = express();
app.use(compression({ level: 6 }));
app.use(helmet({
  contentSecurityPolicy: false, // Vite handle CSP during development
}));
app.use(cookieParser());

// CORS Middleware for split deployment (Vercel Frontend + Railway Backend)
// CORS: only allow explicitly-listed origins (env ALLOWED_ORIGINS comma-separated)
const ALLOWED_ORIGINS = new Set(
  [
    process.env.CORS_ORIGIN,
    ...(process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()),
    "http://localhost:5000",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174"
  ].filter(Boolean)
);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// ── Request ID + Structured Logging Middleware ────────────────────────────
app.use((req: any, res, next) => {
  // Generate unique request ID
  const requestId = crypto.randomUUID().substring(0, 8);
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  // Run entire request inside AsyncLocalStorage context
  requestContext.run({ requestId }, () => {
    const start = Date.now();
    const reqPath = req.path;

    // Log API requests to structured file logger
    if (reqPath.startsWith("/api")) {
      res.on("finish", () => {
        const duration = Date.now() - start;
        logApiRequest(
          req.method, reqPath, res.statusCode, duration,
          req.user?.id,
          res.statusCode >= 400 ? res.statusMessage : undefined
        );
      });
    }

    // Also log to Vite's dev console
    if (reqPath.startsWith("/api")) {
      res.on("finish", () => {
        const duration = Date.now() - start;
        log(`${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`);
      });
    }

    next();
  });
});

import { checkDbConnection } from "./db";

// ── Capture Unhandled Errors (production-critical) ───────────────────────
process.on("unhandledRejection", (reason: any) => {
  logCritical("process", "Unhandled Promise Rejection", {
    message: reason?.message || String(reason),
    stack: reason?.stack?.substring(0, 800),
  });
});

process.on("uncaughtException", (error) => {
  logCritical("process", "Uncaught Exception — server may be unstable", {
    message: error.message,
    stack: error.stack?.substring(0, 800),
  });
  // Don't exit — let graceful shutdown handle it
});

(async () => {
  // Pre-flight check for database connectivity
  try {
    await checkDbConnection();
    logInfo("startup", "Database connection verified");
  } catch (e: any) {
    logCritical("db", "Database connection FAILED", { error: e.message });
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    logError("api", `Express error handler: ${message}`, {
      status,
      stack: err.stack?.substring(0, 500),
    });
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, async () => {
    log(`serving on port ${port}`);
    logInfo("startup", `Server listening on port ${port}`, {
      env: process.env.NODE_ENV || "development",
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    });

    try {
      await seedDatabase();
      logInfo("startup", "Database seeding complete");
      
      const { runPipelineScheduler } = await import("./pipeline-scheduler");
      await runPipelineScheduler();
      
      logInfo("startup", "Background Pipeline Scheduler started");

    } catch (e: any) {
      logError("startup", "Initial seeding failed", { error: e.message, stack: e.stack?.substring(0, 500) });
      const { runPipelineScheduler } = await import("./pipeline-scheduler");
      runPipelineScheduler().catch((err: any) =>
        logError("startup", "Pipeline scheduler failed", { error: err.message })
      );
    }
  });

  // ── Graceful Shutdown ───────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    logInfo("startup", `${signal} received — shutting down gracefully`);
    shutdownLogger(); // Flush all logs to disk before exit
    server.close(() => {
      console.log("[Server] HTTP server closed.");
      process.exit(0);
    });
    // Force exit after 10s if graceful shutdown stalls
    setTimeout(() => {
      console.error("[Server] Forced exit after 10s timeout.");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
