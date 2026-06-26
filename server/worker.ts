import { Worker, Job } from "bullmq";
import * as os from "os";
import { connection } from "./queue";
import { processArticle, generateSmartSummary, ArticleToProcess, retroactivelyMergeToCluster } from "./processing";
import { storage } from "./storage";
import { db } from "./db";
import { articles, deadLetterArticles } from "../shared/schema";
import { eq, desc } from "drizzle-orm";
import { recordWorkerJob, recordClusterEvent, logError } from "./metrics";

console.log("[Worker] Starting BullMQ Workers...");

// 1. Article Processing Worker
const articleWorker = new Worker("article-processing", async (job: Job) => {
  const { article, catMap, systemUserId } = job.data as { 
    article: ArticleToProcess, 
    catMap: Record<string, string>, 
    systemUserId: string 
  };
  
  console.log(`[Worker] Processing article: ${article.title.substring(0, 50)}...`);
  const workerStart = Date.now();
  try {
    const clusterId = await processArticle(article, catMap, systemUserId);
    if (clusterId) {
      await connection.sadd('dirty_clusters', String(clusterId));
      await (await import("./queue")).heavyTaskQueue.add(
        "summary",
        { type: "summary", clusterId },
        { delay: 60000, jobId: `summary-${clusterId}`, removeOnComplete: true }
      );
    }
    recordWorkerJob({ jobId: job.id!, title: article.title || "", status: "success", clusterId: clusterId || undefined, durationMs: Date.now() - workerStart });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Worker] Failed to process article "${article.title}":`, err);
    const isDuplicate = errMsg.includes("23505") || errMsg.includes("duplicate key");
    recordWorkerJob({ jobId: job.id!, title: article.title || "", status: isDuplicate ? "duplicate" : "failed", errorMessage: errMsg, durationMs: Date.now() - workerStart });
    if (!isDuplicate) throw err;
  }
}, { connection: connection as any, concurrency: Math.min(os.cpus().length, 8) });

// 2. Heavy Tasks Worker (Clustering, Summaries)
const heavyTaskWorker = new Worker("heavy-tasks", async (job: Job) => {
  const { type, clusterId } = job.data;
  
  if (type === "summary" && clusterId) {
    console.log(`[Worker] Generating summary and ranking for cluster ${clusterId}`);
    await generateSmartSummary(clusterId);
    await (await import("./processing")).updateClusterImportance(clusterId);
  }
  

}, { connection: connection as any, concurrency: 2 });

const retroactiveMergeWorker = new Worker("retroactive-merge", async (job: Job) => {
  const { clusterId, title, description, embedding, publishedAt } = job.data;
  console.log(`[Worker] Running background retroactive merge for cluster ${clusterId}`);
  await retroactivelyMergeToCluster(clusterId, title, description, embedding, publishedAt);
}, { connection: connection as any, concurrency: 2 });

retroactiveMergeWorker.on("error", (err) => {
  if ((err as any).code !== "ECONNREFUSED") {
    console.error("[Worker] Retroactive merge worker error:", err);
  }
});

articleWorker.on("error", (err) => {
  if ((err as any).code !== "ECONNREFUSED") {
    console.error("[Worker] Article worker error:", err);
  }
});

heavyTaskWorker.on("error", (err) => {
  if ((err as any).code !== "ECONNREFUSED") {
    console.error("[Worker] Heavy task worker error:", err);
  }
});

articleWorker.on("completed", (job) => {
  // console.log(`[Worker] Job ${job.id} completed.`);
});

articleWorker.on("failed", async (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err);
  if (job?.data?.article) {
    try {
      await db.insert(deadLetterArticles).values({
        url: job.data.article.url,
        error: err.message || String(err),
        payload: job.data.article
      });
    } catch (dbErr) {
      console.error("[Worker] Failed to write to dead-letter queue:", dbErr);
    }
  }
});

console.log("[Worker] Article and Heavy Task workers are active.");

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// Lightweight drainer for dirty clusters (replaces heavy-algo sweep)
setInterval(async () => {
  try {
    const ids = await connection.smembers('dirty_clusters');
    if (!ids.length) return;
    
    await connection.del('dirty_clusters');
    
    const { updateClusterImportance, updateClusterVelocity } = await import("./processing");
    
    // Process in small batches, 100ms yield between
    for (const chunk of chunkArray(ids, 10)) {
      await Promise.all(chunk.map(async (id) => {
        await updateClusterImportance(id);
        await updateClusterVelocity(id);
        await generateSmartSummary(id);
      }));
      await new Promise(r => setTimeout(r, 100));
    }
  } catch (err) {
    console.error("[Worker] Dirty cluster drainer failed:", err);
  }
}, 60_000);

export { articleWorker, heavyTaskWorker, retroactiveMergeWorker };

import { runPipelineScheduler } from "./pipeline-scheduler";
(async () => {
  try {
    await runPipelineScheduler();
    console.log("[Worker] Pipeline Scheduler initialized completely inside Worker Process.");
  } catch (err) {
    console.error("[Worker] Failed to start pipeline scheduler:", err);
  }
})();
