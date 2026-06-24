import { log as fileLog } from "./logger";

export type ErrorSeverity = "info" | "warn" | "critical" | "perf";

export interface SystemError {
  id: string;
  severity: ErrorSeverity;
  source: string;
  message: string;
  detail?: string;
  timestamp: Date;
  resolved: boolean;
}

export interface FetchSourceStat {
  source: string;
  tier: number;
  status: "ok" | "failed" | "unchanged";
  articlesEnqueued: number;
  errorMessage?: string;
  durationMs: number;
  timestamp: Date;
}

export interface WorkerJobStat {
  jobId: string | number;
  title: string;
  status: "success" | "failed" | "duplicate";
  clusterId?: string;
  clusterScore?: number;
  errorMessage?: string;
  durationMs: number;
  timestamp: Date;
}

export interface ClusterEvent {
  type: "match" | "new" | "merge";
  clusterId: string;
  score?: number;
  title: string;
  timestamp: Date;
}

export interface ApiCallStat {
  endpoint: string;
  statusCode: number;
  durationMs: number;
  timestamp: Date;
}

export interface SchedulerRun {
  name: string;
  durationMs: number;
  itemsProcessed: number;
  errors: number;
  timestamp: Date;
}

interface Metrics {
  serverStartTime: Date;
  fetchCycleCount: number;
  lastFetchStart: Date | null;
  lastFetchEnd: Date | null;
  currentCycle: FetchSourceStat[];
  recentFetches: FetchSourceStat[];
  workerTotal: number;
  workerSuccess: number;
  workerFailed: number;
  workerDuplicate: number;
  recentJobs: WorkerJobStat[];
  clusterMatches: number;
  clusterNew: number;
  clusterMerges: number;
  recentClusters: ClusterEvent[];
  apiTotal: number;
  apiErrors: number;
  recentApiCalls: ApiCallStat[];
  apiLatency: Record<string, { count: number; totalMs: number; errors: number }>;
  schedulerRuns: SchedulerRun[];
  lastVelocityRun: Date | null;
  lastReclusterRun: Date | null;
  lastEnrichmentRun: Date | null;
  errors: SystemError[];
  errorCounts: { info: number; warn: number; critical: number; perf: number };
  memoryMB: number;
  memoryHistory: { mb: number; t: number }[];
}

let _errorId = 0;
const MAX = 300;

export const metrics: Metrics = {
  serverStartTime: new Date(),
  fetchCycleCount: 0,
  lastFetchStart: null,
  lastFetchEnd: null,
  currentCycle: [],
  recentFetches: [],
  workerTotal: 0,
  workerSuccess: 0,
  workerFailed: 0,
  workerDuplicate: 0,
  recentJobs: [],
  clusterMatches: 0,
  clusterNew: 0,
  clusterMerges: 0,
  recentClusters: [],
  apiTotal: 0,
  apiErrors: 0,
  recentApiCalls: [],
  apiLatency: {},
  schedulerRuns: [],
  lastVelocityRun: null,
  lastReclusterRun: null,
  lastEnrichmentRun: null,
  errors: [],
  errorCounts: { info: 0, warn: 0, critical: 0, perf: 0 },
  memoryMB: 0,
  memoryHistory: [],
};

export function logError(severity: ErrorSeverity, source: string, message: string, detail?: string) {
  const entry: SystemError = {
    id: String(++_errorId),
    severity,
    source,
    message: message.substring(0, 300),
    detail: detail?.substring(0, 500),
    timestamp: new Date(),
    resolved: false,
  };
  metrics.errors.unshift(entry);
  metrics.errorCounts[severity]++;
  if (metrics.errors.length > MAX) metrics.errors.pop();
  // Write to structured file logger
  const level = severity === "critical" ? "critical" : severity === "warn" ? "warn" : severity === "perf" ? "perf" : "info";
  fileLog(level, source as any, message, detail ? { detail } : undefined);
}

export function recordFetchStart() {
  metrics.lastFetchStart = new Date();
  metrics.currentCycle = [];
  metrics.fetchCycleCount++;
  fileLog("info", "fetcher", `═══ Fetch cycle #${metrics.fetchCycleCount} STARTED ═══`);
}

export function recordFetchEnd() {
  metrics.lastFetchEnd = new Date();
  const ok = metrics.currentCycle.filter(s => s.status === "ok").length;
  const failed = metrics.currentCycle.filter(s => s.status === "failed").length;
  const total = metrics.currentCycle.reduce((sum, s) => sum + s.articlesEnqueued, 0);
  fileLog("info", "fetcher",
    `═══ Fetch cycle #${metrics.fetchCycleCount} ENDED: ${ok} ok, ${failed} failed, ${total} articles enqueued ═══`,
    { cycleNumber: metrics.fetchCycleCount, sourcesOk: ok, sourcesFailed: failed, totalArticles: total }
  );
}

export function recordFetchSource(stat: Omit<FetchSourceStat, "timestamp">) {
  const entry = { ...stat, timestamp: new Date() };
  metrics.currentCycle.push(entry);
  metrics.recentFetches.unshift(entry);
  if (metrics.recentFetches.length > MAX) metrics.recentFetches.pop();
  if (stat.status === "failed") logError("warn", "fetcher", `${stat.source} failed`, stat.errorMessage);
  // File log for every source fetch
  fileLog(stat.status === "failed" ? "warn" : "info", "fetcher",
    `${stat.source} [tier${stat.tier}] → ${stat.status} (${stat.articlesEnqueued} articles, ${stat.durationMs}ms)`,
    { source: stat.source, tier: stat.tier, status: stat.status, articlesEnqueued: stat.articlesEnqueued, durationMs: stat.durationMs, error: stat.errorMessage }
  );
}

export function recordWorkerJob(stat: Omit<WorkerJobStat, "timestamp">) {
  const entry = { ...stat, timestamp: new Date() };
  metrics.workerTotal++;
  if (stat.status === "success") metrics.workerSuccess++;
  else if (stat.status === "failed") metrics.workerFailed++;
  else metrics.workerDuplicate++;
  metrics.recentJobs.unshift(entry);
  if (metrics.recentJobs.length > MAX) metrics.recentJobs.pop();
  if (stat.status === "failed") {
    const isCritical = stat.errorMessage?.includes("not defined") ||
      stat.errorMessage?.includes("Cannot read") ||
      stat.errorMessage?.includes("ECONNREFUSED");
    logError(isCritical ? "critical" : "warn", "worker",
      `Job failed: ${stat.title.substring(0, 60)}`, stat.errorMessage);
  }
  if (stat.durationMs > 5000) {
    logError("perf", "worker", `Slow job ${stat.durationMs}ms: ${stat.title.substring(0, 60)}`);
  }
  // File log for every worker job
  fileLog(stat.status === "failed" ? "error" : stat.status === "duplicate" ? "info" : "info", "worker",
    `Job ${stat.status}: ${stat.title.substring(0, 80)} (${stat.durationMs}ms)`,
    { jobId: stat.jobId, status: stat.status, clusterId: stat.clusterId, clusterScore: stat.clusterScore, durationMs: stat.durationMs, error: stat.errorMessage }
  );
}

export function recordClusterEvent(event: Omit<ClusterEvent, "timestamp">) {
  const entry = { ...event, timestamp: new Date() };
  if (event.type === "match") metrics.clusterMatches++;
  else if (event.type === "new") metrics.clusterNew++;
  else metrics.clusterMerges++;
  metrics.recentClusters.unshift(entry);
  if (metrics.recentClusters.length > MAX) metrics.recentClusters.pop();
  fileLog("info", "cluster", `Cluster ${event.type}: ${event.title.substring(0, 80)}`,
    { type: event.type, clusterId: event.clusterId, score: event.score }
  );
}

export function recordApiCall(stat: Omit<ApiCallStat, "timestamp">) {
  const entry = { ...stat, timestamp: new Date() };
  metrics.apiTotal++;
  if (stat.statusCode >= 400) metrics.apiErrors++;
  metrics.recentApiCalls.unshift(entry);
  if (metrics.recentApiCalls.length > MAX) metrics.recentApiCalls.pop();
  const key = stat.endpoint.replace(/\/[a-f0-9-]{8,}/g, "/:id");
  if (!metrics.apiLatency[key]) metrics.apiLatency[key] = { count: 0, totalMs: 0, errors: 0 };
  metrics.apiLatency[key].count++;
  metrics.apiLatency[key].totalMs += stat.durationMs;
  if (stat.statusCode >= 400) metrics.apiLatency[key].errors++;
  if (stat.statusCode >= 500) logError("critical", "api", `500 on ${stat.endpoint}`);
  if (stat.durationMs > 2000) logError("perf", "api", `Slow API ${stat.durationMs}ms ${stat.endpoint}`);
}

export function recordSchedulerRun(run: Omit<SchedulerRun, "timestamp">) {
  const entry = { ...run, timestamp: new Date() };
  metrics.schedulerRuns.unshift(entry);
  if (metrics.schedulerRuns.length > 100) metrics.schedulerRuns.pop();
  if (run.name === "velocity") metrics.lastVelocityRun = entry.timestamp;
  if (run.name === "recluster") metrics.lastReclusterRun = entry.timestamp;
  if (run.name === "enrichment") metrics.lastEnrichmentRun = entry.timestamp;
  if (run.errors > 0) logError("warn", "scheduler", `${run.name} had ${run.errors} errors`);
  if (run.durationMs > 30000) logError("perf", "scheduler", `${run.name} took ${(run.durationMs / 1000).toFixed(1)}s`);
  // File log for every scheduler run
  fileLog(run.errors > 0 ? "warn" : "info", "scheduler",
    `Scheduler ${run.name}: ${run.itemsProcessed} items in ${run.durationMs}ms (${run.errors} errors)`,
    { name: run.name, itemsProcessed: run.itemsProcessed, durationMs: run.durationMs, errors: run.errors }
  );
}

export function resolveError(id: string) {
  const err = metrics.errors.find(e => e.id === id);
  if (err) err.resolved = true;
}

// Memory polling every 30s
setInterval(() => {
  const mb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  metrics.memoryMB = mb;
  metrics.memoryHistory.push({ mb, t: Date.now() });
  if (metrics.memoryHistory.length > 120) metrics.memoryHistory.shift();
  if (mb > 600) logError("critical", "process", `High memory: ${mb}MB heap — OOM risk`);
  else if (mb > 400) logError("warn", "process", `Elevated memory: ${mb}MB heap`);
}, 30_000);

export async function getQueueDepth() {
  try {
    const { heavyTaskQueue } = await import("./queue");
    // count using bullmq api
    const waiting = await heavyTaskQueue.getWaitingCount();
    const active = await heavyTaskQueue.getActiveCount();
    const delayed = await heavyTaskQueue.getDelayedCount();
    const failed = await heavyTaskQueue.getFailedCount();
    return { waiting, active, delayed, failed };
  } catch (err) {
    return { waiting: 0, active: 0, delayed: 0, failed: 0 };
  }
}

