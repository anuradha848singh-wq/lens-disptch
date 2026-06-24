/**
 * THE LENS DISPATCH — Client-Side Error & Performance Logger
 *
 * Captures:
 * - Unhandled JS errors (window.onerror)
 * - Unhandled promise rejections
 * - API call timings and failures
 * - ErrorBoundary component crashes
 * - Performance marks (slow loads)
 *
 * Batch-sends to POST /api/logs/client every 30 seconds.
 */

type ClientLogLevel = "error" | "warn" | "perf" | "info";

interface ClientLogEntry {
  level: ClientLogLevel;
  type: string;
  message: string;
  url?: string;
  stack?: string;
  data?: Record<string, any>;
  timestamp: string;
  userAgent?: string;
}

const BATCH_INTERVAL = 30_000; // 30 seconds
const MAX_QUEUE = 50;

let queue: ClientLogEntry[] = [];
let batchTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

function createEntry(level: ClientLogLevel, type: string, message: string, data?: Record<string, any>): ClientLogEntry {
  return {
    level,
    type,
    message: message?.substring(0, 500) || "Unknown",
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent.substring(0, 200),
    ...( data ? { data } : {}),
  };
}

function enqueue(entry: ClientLogEntry) {
  queue.push(entry);
  if (queue.length > MAX_QUEUE) queue.shift(); // Drop oldest if overflow

  // Immediately flush critical errors
  if (entry.level === "error") {
    flushQueue();
  }
}

async function flushQueue() {
  if (queue.length === 0) return;
  const batch = [...queue];
  queue = [];

  try {
    const res = await fetch("/api/logs/client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ errors: batch }),
    });
    if (!res.ok) {
      // Put back failed entries (but don't retry forever)
      console.warn("[ClientLogger] Failed to send logs:", res.status);
    }
  } catch {
    // Network error — silently fail, don't cause more errors
  }
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Initialize the client logger. Call once on app mount.
 */
export function initClientLogger() {
  if (initialized) return;
  initialized = true;

  // Capture unhandled errors
  window.onerror = (message, source, lineno, colno, error) => {
    enqueue(createEntry("error", "unhandled_error", String(message), {
      source,
      lineno,
      colno,
      stack: error?.stack?.substring(0, 500),
    }));
    return false; // Don't suppress default handling
  };

  // Capture unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    enqueue(createEntry("error", "unhandled_rejection",
      reason?.message || String(reason),
      { stack: reason?.stack?.substring(0, 500) }
    ));
  });

  // Start batch flush timer
  batchTimer = setInterval(flushQueue, BATCH_INTERVAL);

  console.log("[ClientLogger] Initialized — capturing errors and performance");
}

/**
 * Log a React ErrorBoundary crash.
 */
export function logComponentError(error: Error, componentStack?: string) {
  enqueue(createEntry("error", "component_crash", error.message, {
    stack: error.stack?.substring(0, 500),
    componentStack: componentStack?.substring(0, 300),
  }));
}

/**
 * Log an API call result (success or failure).
 */
export function logApiCall(path: string, method: string, statusCode: number, durationMs: number, error?: string) {
  // Only log failures and slow calls to avoid noise
  if (statusCode >= 400 || durationMs > 3000) {
    const level: ClientLogLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "perf";
    enqueue(createEntry(level, "api_call", `${method} ${path} → ${statusCode} (${durationMs}ms)`, {
      path, method, statusCode, durationMs,
      ...(error ? { error: error.substring(0, 300) } : {}),
    }));
  }
}

/**
 * Log a performance event (e.g., slow page load).
 */
export function logSlowLoad(page: string, durationMs: number) {
  if (durationMs > 3000) {
    enqueue(createEntry("perf", "slow_load", `Slow page load: ${page} (${durationMs}ms)`, {
      page, durationMs,
    }));
  }
}

/**
 * Log a custom event.
 */
export function logClientEvent(level: ClientLogLevel, type: string, message: string, data?: Record<string, any>) {
  enqueue(createEntry(level, type, message, data));
}

/**
 * Force flush all pending logs (call on page unload).
 */
export function flushClientLogs() {
  flushQueue();
}
