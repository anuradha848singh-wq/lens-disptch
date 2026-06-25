import { db } from "../server/db";
import { articles, clusters, publishers } from "../shared/schema";
import { connection, articleQueue } from "../server/queue";
import { fetchRealNews } from "../server/news-fetcher";
import { generateSmartSummary, runEnrichmentManager, clearClusterIndexCache } from "../server/processing";
import { benchmarkMetrics } from "../server/benchmark-collector";
import { articleWorker, heavyTaskWorker, retroactiveMergeWorker } from "../server/worker";
import { sql } from "drizzle-orm";
import { performance } from "perf_hooks";
import * as fs from "fs";

async function main() {
  console.log("=== ARTICLE PIPELINE BENCHMARK RUN ===");

  // 1. Clean DB and reset fetch states
  console.log("Cleaning database tables for a fresh benchmark...");
  await db.delete(articles);
  await db.delete(clusters);
  clearClusterIndexCache();
  try {
    await db.execute(sql`TRUNCATE TABLE article_embeddings CASCADE;`);
  } catch (e) {
    console.log("Could not truncate article_embeddings, skipping (might not exist or using schema relations)");
  }
  try {
    await db.execute(sql`TRUNCATE TABLE cluster_scores CASCADE;`);
  } catch (e) {
    console.log("Could not truncate cluster_scores, skipping");
  }
  try {
    await db.execute(sql`TRUNCATE TABLE homepage_cache CASCADE;`);
  } catch (e) {
    console.log("Could not truncate homepage_cache, skipping");
  }
  
  console.log("Resetting publisher fetch metadata...");
  await db.update(publishers).set({
    lastFetchedAt: null,
    lastEtag: null,
    lastModified: null,
    failCount: 0
  });

  // Clear Redis queue and dirty clusters
  console.log("Clearing Redis queues...");
  await connection.del("dirty_clusters");
  await connection.del("homepage:v1");
  try {
    const keys = await connection.keys("bull:article-processing:*");
    if (keys.length > 0) {
      await connection.del(...keys);
    }
  } catch (e) {
    console.log("Could not clear Redis keys, skipping:", (e as Error).message);
  }

  // Close background heavy task and retroactive merge workers to run them synchronously/manually
  console.log("Pausing heavy background task and retroactive merge workers...");
  await heavyTaskWorker.close();
  await retroactiveMergeWorker.close();

  // Track concurrency for the articleWorker
  let activeInFlight = 0;
  const inFlightSamples: number[] = [];
  
  const sampleInterval = setInterval(() => {
    inFlightSamples.push(activeInFlight);
  }, 100);

  articleWorker.on("active", () => {
    activeInFlight++;
  });
  articleWorker.on("completed", () => {
    activeInFlight--;
  });
  articleWorker.on("failed", () => {
    activeInFlight--;
  });

  console.log("Starting full-pipeline execution...");
  const wallClockStart = performance.now();
  
  // Clear metrics
  benchmarkMetrics.clear();

  // Run the RSS Ingestion (Discovery, Local Dedup, Batch Embedding)
  console.log("Running fetchRealNews(). This fetches live feeds, embeds them, and enqueues to BullMQ...");
  const enqueuedCount = await fetchRealNews();
  console.log(`Enqueued ${enqueuedCount} articles to the BullMQ queue.`);

  // Wait for the queue to drain
  console.log("Waiting for BullMQ worker to process all articles...");
  let lastActive = Date.now();
  while (true) {
    const active = await articleQueue.getActiveCount();
    const waiting = await articleQueue.getJobCounts();
    const totalPending = waiting.waiting + waiting.active + waiting.delayed;
    
    console.log(`Queue Status: pending=${totalPending}, active=${active}, inFlightTracker=${activeInFlight}`);
    
    if (totalPending === 0 && active === 0 && activeInFlight === 0) {
      break;
    }
    
    if (active > 0 || totalPending > 0) {
      lastActive = Date.now();
    } else if (Date.now() - lastActive > 60000) {
      console.warn("Queue draining timed out due to 60s inactivity.");
      break;
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  clearInterval(sampleInterval);
  console.log("Ingestion queue drained!");

  // Now run Extraction (scraping body html for hot clusters)
  console.log("Running Enrichment Manager (Extraction)...");
  await runEnrichmentManager();

  // Now run Groq Summarization
  console.log("Running Summaries on hot clusters...");
  const dirtyClusterIds = await connection.smembers("dirty_clusters");
  console.log(`Found ${dirtyClusterIds.length} dirty clusters to summarize.`);
  
  const clusterSummaryCompletions = new Map<string, number>();
  
  for (const clusterId of dirtyClusterIds) {
    try {
      await generateSmartSummary(clusterId);
      clusterSummaryCompletions.set(clusterId, Date.now());
    } catch (err: any) {
      console.error(`Failed to summarize cluster ${clusterId}:`, err.message);
    }
  }

  const wallClockEnd = performance.now();
  const totalWallClockTimeMs = wallClockEnd - wallClockStart;

  // Retrieve all processed articles to compute E2E metrics
  const allSavedArticles = await db.select({
    id: articles.id,
    clusterId: articles.clusterId,
    trace: articles.trace,
    title: articles.title
  }).from(articles);

  const e2eLatencies: number[] = [];
  let successfulE2E = 0;
  let totalE2EAttempts = 0;

  for (const art of allSavedArticles) {
    const trace = typeof art.trace === 'string' ? JSON.parse(art.trace) : art.trace;
    if (trace && trace.fetched) {
      totalE2EAttempts++;
      const fetchedTime = new Date(trace.fetched).getTime();
      if (art.clusterId && clusterSummaryCompletions.has(art.clusterId)) {
        const summarizedTime = clusterSummaryCompletions.get(art.clusterId)!;
        e2eLatencies.push(summarizedTime - fetchedTime);
        successfulE2E++;
      }
    }
  }

  // Count active sources from publisher records with lastFetchedAt
  const [{ count: sourcesCount }] = await db.select({ count: sql<number>`count(*)` })
    .from(publishers)
    .where(sql`last_fetched_at IS NOT NULL`);

  // Analyze metrics data
  const data = benchmarkMetrics.data;
  console.log(`Collected ${data.length} metric records.`);

  const stages = ["Discovery", "Embedding", "Extraction", "Cluster", "Summarize"];
  const stageStats = stages.map(stage => {
    const records = data.filter(r => r.stage === stage);
    const count = records.length;
    const successCount = records.filter(r => r.status === "success").length;
    const errorRecords = records.filter(r => r.status === "error");
    const errorCount = errorRecords.length;
    
    const errorsByType: Record<string, number> = {};
    errorRecords.forEach(r => {
      const type = r.errorType || "UnknownError";
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });
    
    const errorString = Object.entries(errorsByType)
      .map(([type, count]) => `${type} (x${count})`)
      .join(", ") || "None";

    const durations = records.map(r => r.durationMs);
    const successDurations = records.filter(r => r.status === "success").map(r => r.durationMs);
    const percentiles = getPercentiles(successDurations);

    const totalStageDurationMs = durations.reduce((a, b) => a + b, 0);
    const throughput = totalStageDurationMs > 0 ? (count / (totalStageDurationMs / 1000)) : 0;

    return {
      stage,
      count,
      successCount,
      errorCount,
      errorString,
      ...percentiles,
      throughput
    };
  });

  const maxConcurrencyAchieved = Math.max(...inFlightSamples, 0);
  const avgConcurrencyAchieved = inFlightSamples.length > 0
    ? inFlightSamples.reduce((a, b) => a + b, 0) / inFlightSamples.length
    : 0;

  const e2eStats = getPercentiles(e2eLatencies);

  // Write markdown report
  const reportPath = "C:/Users/dextop/Downloads/ModernNewsPlatform/benchmark_report.md";
  
  let markdown = `## Benchmark Run Parameters
- Articles processed: ${allSavedArticles.length}
- Sources covered: ${sourcesCount}
- Run duration: ${(totalWallClockTimeMs / 1000).toFixed(2)}s
- Date/environment: local / WSL2 Windows Docker Dev, ${new Date().toISOString()}

## Per-Stage Metrics
| Stage | Count | Success | Errors (by type) | p50 (ms) | p95 (ms) | p99 (ms) | Throughput (items/sec) |
|---|---|---|---|---|---|---|---|
`;

  stageStats.forEach(s => {
    markdown += `| ${s.stage} | ${s.count} | ${s.successCount} | ${s.errorString} | ${s.p50.toFixed(1)} | ${s.p95.toFixed(1)} | ${s.p99.toFixed(1)} | ${s.throughput.toFixed(2)} |\n`;
  });

  markdown += `
## End-to-End
- Median article latency (discovery → persisted): ${e2eStats.p50.toFixed(1)} ms
- p95 article latency: ${e2eStats.p95.toFixed(1)} ms
- Total errors / total attempts: ${data.filter(r => r.status === "error").length} / ${data.length}
- Concurrency actually achieved vs. configured: ${maxConcurrencyAchieved} / 8

## Observed Bottleneck (data-driven, not assumed)
`;

  const slowestStage = stageStats.reduce((max, s) => s.p95 > max.p95 ? s : max, stageStats[0]);
  markdown += `The slowest stage by p95 latency is **${slowestStage.stage}** with p95 = ${slowestStage.p95.toFixed(1)} ms (max = ${slowestStage.max.toFixed(1)} ms). `;
  
  const errorStages = stageStats.filter(s => s.errorCount > 0);
  if (errorStages.length > 0) {
    markdown += `Errors were observed in: ${errorStages.map(s => `${s.stage} (${s.errorCount} errors)`).join(", ")}. `;
  } else {
    markdown += "No errors were encountered during the benchmark run. ";
  }

  // Highlight specific Jina / pgvector clustering latency observations if present
  const clusterStats = stageStats.find(s => s.stage === "Cluster");
  if (clusterStats && clusterStats.p95 > 200) {
    markdown += `Clustering latency (p95 = ${clusterStats.p95.toFixed(1)} ms) is high, indicating database or pgvector lookup stalls. `;
  }

  fs.writeFileSync(reportPath, markdown, "utf8");
  console.log(`\nReport successfully written to: ${reportPath}`);

  // Shutdown workers and Redis connection
  await articleWorker.close();
  await connection.quit();
  process.exit(0);
}

function getPercentiles(durations: number[]) {
  if (durations.length === 0) return { p50: 0, p95: 0, p99: 0, max: 0 };
  const sorted = [...durations].sort((a, b) => a - b);
  const percent = (p: number) => {
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  };
  return {
    p50: percent(50),
    p95: percent(95),
    p99: percent(99),
    max: sorted[sorted.length - 1]
  };
}

main().catch(err => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
