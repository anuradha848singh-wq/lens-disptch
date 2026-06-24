/**
 * ═══════════════════════════════════════════════════════════════════
 * THE LENS DISPATCH — Production Structured Logger
 * ═══════════════════════════════════════════════════════════════════
 *
 * Session-based JSONL logging with:
 * - New log file per server start (fresh on each `start-local.bat`)
 * - 48h retention of old sessions
 * - Structured JSON Lines format for LLM analysis
 * - Full request tracing, error capture, and performance monitoring
 * - Query API for searching and exporting logs
 */

import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { AsyncLocalStorage } from "async_hooks";

// ── Types ──────────────────────────────────────────────────────────

export type LogLevel = "info" | "warn" | "error" | "critical" | "perf" | "debug";
export type LogSource =
  | "api" | "fetcher" | "worker" | "cluster" | "scheduler"
  | "db" | "process" | "client" | "auth" | "cache" | "startup";

export interface LogEntry {
  /** ISO timestamp */
  t: string;
  /** Log level */
  l: LogLevel;
  /** Source system */
  s: LogSource;
  /** Human-readable message */
  m: string;
  /** Structured data payload */
  d?: Record<string, any>;
  /** Request ID (for API call tracing) */
  rid?: string;
}

export interface LogQuery {
  hours?: number;
  level?: LogLevel;
  source?: LogSource;
  search?: string;
  limit?: number;
}

export interface LogDiagnosis {
  generated: string;
  sessionStart: string;
  sessionFile: string;
  uptimeMinutes: number;
  summary: {
    totalLogs: number;
    info: number;
    warn: number;
    error: number;
    critical: number;
    perf: number;
  };
  topErrors: { message: string; source: string; count: number; lastSeen: string }[];
  slowestEndpoints: { endpoint: string; avgMs: number; count: number; errors: number }[];
  failedSources: { source: string; error: string; time: string }[];
  clientErrors: { message: string; url: string; count: number }[];
  recommendations: string[];
}

// ── Constants ──────────────────────────────────────────────────────

const LOG_DIR = path.join(process.cwd(), "logs");
const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours retention
const FLUSH_INTERVAL = 2000; // Flush buffer every 2s
const MAX_BUFFER_SIZE = 50; // Flush when buffer exceeds this

// ── State ──────────────────────────────────────────────────────────

const sessionStart = new Date();
const sessionId = sessionStart.toISOString().replace(/[:.]/g, "-").slice(0, 19);
const sessionFileName = `server-${sessionId}.jsonl`;
const sessionFilePath = path.join(LOG_DIR, sessionFileName);

let writeStream: fs.WriteStream | null = null;
let buffer: string[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;
let totalLinesWritten = 0;

// AsyncLocalStorage for request ID propagation
export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

// ── Core Logger ────────────────────────────────────────────────────

function ensureInit() {
  if (initialized) return;
  initialized = true;

  // Create logs directory
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  // Open write stream (append mode)
  writeStream = fs.createWriteStream(sessionFilePath, { flags: "a", encoding: "utf8" });

  writeStream.on("error", (err) => {
    console.error("[Logger] Write stream error:", err.message);
    writeStream = null;
  });

  // Periodic flush
  flushTimer = setInterval(flushBuffer, FLUSH_INTERVAL);

  // Cleanup old log files
  cleanupOldLogs().catch(() => {});

  // Write startup marker
  const startupEntry: LogEntry = {
    t: sessionStart.toISOString(),
    l: "info",
    s: "startup",
    m: "═══ NEW SESSION STARTED ═══",
    d: {
      sessionId,
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      cwd: process.cwd(),
      env: process.env.NODE_ENV || "development",
      port: process.env.PORT || "5000",
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  };
  writeEntry(startupEntry);
}

function writeEntry(entry: LogEntry) {
  const line = JSON.stringify(entry) + "\n";
  buffer.push(line);
  totalLinesWritten++;

  // Also emit to console with color prefix
  const prefix =
    entry.l === "critical" ? "🔴" :
    entry.l === "error" ? "❌" :
    entry.l === "warn" ? "🟡" :
    entry.l === "perf" ? "🟠" :
    entry.l === "debug" ? "🔵" : "✅";

  const short = `${prefix} [${entry.s.toUpperCase()}] ${entry.m}`;
  if (entry.l === "critical" || entry.l === "error") {
    console.error(short);
  } else if (entry.l === "warn") {
    console.warn(short);
  } else {
    console.log(short);
  }

  // Flush immediately if buffer is large
  if (buffer.length >= MAX_BUFFER_SIZE) {
    flushBuffer();
  }
}

function flushBuffer() {
  if (buffer.length === 0 || !writeStream) return;
  const data = buffer.join("");
  buffer = [];
  writeStream.write(data);
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Main log function. Call this instead of console.log.
 */
export function log(level: LogLevel, source: LogSource, message: string, data?: Record<string, any>) {
  ensureInit();
  const ctx = requestContext.getStore();
  const entry: LogEntry = {
    t: new Date().toISOString(),
    l: level,
    s: source,
    m: message.substring(0, 500),
    ...(data && Object.keys(data).length > 0 ? { d: sanitizeData(data) } : {}),
    ...(ctx?.requestId ? { rid: ctx.requestId } : {}),
  };
  writeEntry(entry);
}

/** Convenience wrappers */
export const logInfo = (source: LogSource, msg: string, data?: Record<string, any>) => log("info", source, msg, data);
export const logWarn = (source: LogSource, msg: string, data?: Record<string, any>) => log("warn", source, msg, data);
export const logError = (source: LogSource, msg: string, data?: Record<string, any>) => log("error", source, msg, data);
export const logCritical = (source: LogSource, msg: string, data?: Record<string, any>) => log("critical", source, msg, data);
export const logPerf = (source: LogSource, msg: string, data?: Record<string, any>) => log("perf", source, msg, data);
export const logDebug = (source: LogSource, msg: string, data?: Record<string, any>) => log("debug", source, msg, data);

/**
 * Log an API request completion.
 */
export function logApiRequest(
  method: string, path: string, statusCode: number,
  durationMs: number, userId?: string, error?: string
) {
  const level: LogLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : durationMs > 3000 ? "perf" : "info";
  log(level, "api", `${method} ${path} → ${statusCode} (${durationMs}ms)`, {
    method, path, statusCode, durationMs,
    ...(userId ? { userId } : {}),
    ...(error ? { error: error.substring(0, 300) } : {}),
  });
}

/**
 * Log a client-side error (received from frontend).
 */
export function logClientError(errors: any[]) {
  for (const err of errors) {
    log("error", "client", err.message || "Unknown client error", {
      type: err.type,
      url: err.url,
      stack: err.stack?.substring(0, 500),
      userAgent: err.userAgent?.substring(0, 200),
      timestamp: err.timestamp,
    });
  }
}

// ── Log Query Functions ────────────────────────────────────────────

/**
 * Read and parse log entries from the current session file.
 */
export async function queryLogs(query: LogQuery = {}): Promise<LogEntry[]> {
  const { hours = 6, level, source, search, limit = 200 } = query;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Flush buffer first so latest entries are on disk
  flushBuffer();

  const entries: LogEntry[] = [];

  // Read from all session files within the time window
  const files = await getLogFiles();
  for (const file of files) {
    try {
      const content = await fsp.readFile(path.join(LOG_DIR, file), "utf8");
      for (const line of content.split("\n")) {
        if (!line.trim()) continue;
        try {
          const entry: LogEntry = JSON.parse(line);
          if (new Date(entry.t) < cutoff) continue;
          if (level && entry.l !== level) continue;
          if (source && entry.s !== source) continue;
          if (search && !entry.m.toLowerCase().includes(search.toLowerCase()) &&
              !JSON.stringify(entry.d || {}).toLowerCase().includes(search.toLowerCase())) continue;
          entries.push(entry);
        } catch { /* skip malformed lines */ }
      }
    } catch { /* skip unreadable files */ }
  }

  // Sort newest first and limit
  entries.sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());
  return entries.slice(0, limit);
}

/**
 * Generate a structured diagnosis report for LLM consumption.
 */
export async function generateDiagnosis(): Promise<LogDiagnosis> {
  const entries = await queryLogs({ hours: 12, limit: 10000 });
  const uptimeMinutes = Math.round((Date.now() - sessionStart.getTime()) / 60000);

  // Counts
  const summary = { totalLogs: entries.length, info: 0, warn: 0, error: 0, critical: 0, perf: 0 };
  for (const e of entries) {
    if (e.l in summary) (summary as any)[e.l]++;
  }

  // Top errors (deduplicated by message)
  const errorMap = new Map<string, { message: string; source: string; count: number; lastSeen: string }>();
  for (const e of entries.filter(e => e.l === "error" || e.l === "critical")) {
    const key = `${e.s}:${e.m.substring(0, 80)}`;
    const existing = errorMap.get(key);
    if (existing) {
      existing.count++;
      if (e.t > existing.lastSeen) existing.lastSeen = e.t;
    } else {
      errorMap.set(key, { message: e.m, source: e.s, count: 1, lastSeen: e.t });
    }
  }
  const topErrors = [...errorMap.values()].sort((a, b) => b.count - a.count).slice(0, 15);

  // Slowest endpoints
  const epMap = new Map<string, { totalMs: number; count: number; errors: number }>();
  for (const e of entries.filter(e => e.s === "api" && e.d?.durationMs)) {
    const ep = e.d?.path || e.m.split(" ")[1] || "unknown";
    const key = ep.replace(/[a-f0-9-]{8,}/g, ":id");
    const existing = epMap.get(key) || { totalMs: 0, count: 0, errors: 0 };
    existing.totalMs += e.d!.durationMs;
    existing.count++;
    if (e.d?.statusCode >= 400) existing.errors++;
    epMap.set(key, existing);
  }
  const slowestEndpoints = [...epMap.entries()]
    .map(([endpoint, v]) => ({ endpoint, avgMs: Math.round(v.totalMs / v.count), count: v.count, errors: v.errors }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 10);

  // Failed fetch sources
  const failedSources = entries
    .filter(e => e.s === "fetcher" && (e.l === "error" || e.l === "warn"))
    .slice(0, 10)
    .map(e => ({ source: e.d?.source || e.m, error: e.d?.error || e.m, time: e.t }));

  // Client errors
  const clientErrMap = new Map<string, { message: string; url: string; count: number }>();
  for (const e of entries.filter(e => e.s === "client")) {
    const key = e.m.substring(0, 100);
    const existing = clientErrMap.get(key);
    if (existing) { existing.count++; }
    else { clientErrMap.set(key, { message: e.m, url: e.d?.url || "", count: 1 }); }
  }
  const clientErrors = [...clientErrMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  // Recommendations
  const recommendations: string[] = [];
  if (summary.critical > 0) recommendations.push(`🔴 ${summary.critical} CRITICAL errors need immediate attention`);
  if (summary.error > 5) recommendations.push(`❌ ${summary.error} errors in last 12h — check topErrors for patterns`);
  const slowEps = slowestEndpoints.filter(e => e.avgMs > 2000);
  if (slowEps.length > 0) recommendations.push(`🟠 ${slowEps.length} endpoints averaging >2s — consider caching or query optimization`);
  if (failedSources.length > 3) recommendations.push(`🟡 ${failedSources.length} fetch sources failing — check RSS feed URLs and network`);
  if (clientErrors.length > 0) recommendations.push(`📱 ${clientErrors.length} unique client-side errors — check frontend ErrorBoundary logs`);
  const memEntries = entries.filter(e => e.s === "process" && e.d?.memoryMB);
  if (memEntries.length > 0 && memEntries[0].d!.memoryMB > 400) {
    recommendations.push(`⚠️ Memory at ${memEntries[0].d!.memoryMB}MB — potential leak, consider restarting`);
  }
  if (recommendations.length === 0) recommendations.push("✅ No major issues detected — system healthy");

  return {
    generated: new Date().toISOString(),
    sessionStart: sessionStart.toISOString(),
    sessionFile: sessionFileName,
    uptimeMinutes,
    summary,
    topErrors,
    slowestEndpoints,
    failedSources,
    clientErrors,
    recommendations,
  };
}

/**
 * Get the raw JSONL content of the current session for download/export.
 */
export async function exportCurrentSession(): Promise<string> {
  flushBuffer();
  try {
    return await fsp.readFile(sessionFilePath, "utf8");
  } catch {
    return "";
  }
}

/**
 * Get summary of all available log files.
 */
export async function getLogFilesSummary(): Promise<{ name: string; sizeKB: number; modified: string }[]> {
  const files = await getLogFiles();
  const result = [];
  for (const file of files) {
    try {
      const stat = await fsp.stat(path.join(LOG_DIR, file));
      result.push({
        name: file,
        sizeKB: Math.round(stat.size / 1024),
        modified: stat.mtime.toISOString(),
      });
    } catch { /* skip */ }
  }
  return result;
}

// ── Internal Helpers ───────────────────────────────────────────────

async function getLogFiles(): Promise<string[]> {
  try {
    const files = await fsp.readdir(LOG_DIR);
    return files
      .filter(f => f.startsWith("server-") && f.endsWith(".jsonl"))
      .sort()
      .reverse(); // Newest first
  } catch {
    return [];
  }
}

async function cleanupOldLogs() {
  try {
    const files = await fsp.readdir(LOG_DIR);
    const now = Date.now();
    for (const file of files) {
      if (!file.startsWith("server-") || !file.endsWith(".jsonl")) continue;
      const filePath = path.join(LOG_DIR, file);
      const stat = await fsp.stat(filePath);
      if (now - stat.mtimeMs > MAX_AGE_MS) {
        await fsp.unlink(filePath);
        console.log(`[Logger] Cleaned up old log: ${file}`);
      }
    }
  } catch { /* ignore cleanup errors */ }
}

function sanitizeData(data: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (key === "password" || key === "passwordHash" || key === "token" || key === "cookie") continue;
    if (typeof val === "string" && val.length > 1000) {
      clean[key] = val.substring(0, 1000) + "…";
    } else if (val instanceof Error) {
      clean[key] = { message: val.message, stack: val.stack?.substring(0, 500) };
    } else if (typeof val === "object" && val !== null) {
      try {
        const s = JSON.stringify(val);
        if (s.length > 2000) clean[key] = JSON.parse(s.substring(0, 2000));
        else clean[key] = val;
      } catch {
        clean[key] = String(val);
      }
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

// ── Shutdown ───────────────────────────────────────────────────────

export function shutdownLogger() {
  log("info", "startup", "═══ SESSION ENDING ═══", {
    uptimeMinutes: Math.round((Date.now() - sessionStart.getTime()) / 60000),
    totalLinesWritten,
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  });
  flushBuffer();
  if (flushTimer) clearInterval(flushTimer);
  writeStream?.end();
}
