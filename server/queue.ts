import "dotenv/config";
import { Queue } from "bullmq";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  connectTimeout: 15000,
  retryStrategy: (times) => {
    if (times > 30) {
      console.error("[Redis] Unreachable after 30 retries — switching to demo mode");
      return null;
    }
    const delay = Math.min(times * 200, 2000);
    console.log(`[Redis] Reconnecting attempt ${times}, waiting ${delay}ms...`);
    return delay;
  },
});

let _isRedisAvailable = false;

/** Whether Redis is currently connected */
export function isRedisConnected(): boolean {
  return _isRedisAvailable;
}

// Single consolidated event handlers (no duplicates)
connection.on("connect", () => {
  _isRedisAvailable = true;
  // Reset cached queue instances so they rebuild with real Redis
  _articleQueue = null;
  _heavyTaskQueue = null;
  _retroactiveMergeQueue = null;
  console.log("[Redis] Connected — queues restored.");
});

connection.on("error", (err: any) => {
  _isRedisAvailable = false;
  if (err.code === "ETIMEDOUT" || err.code === "ECONNRESET") {
    console.log("[Redis] Connection lost — will retry automatically.");
  } else if (err.code !== "ECONNREFUSED") {
    console.error("[Redis] Connection error:", err.message);
  }
});

class MockQueue {
  name: string;
  private running = 0;
  private readonly MAX_CONCURRENT = 8;
  private pending: Array<() => void> = [];

  constructor(name: string) { this.name = name; }

  private async runWhenSlotAvailable(): Promise<void> {
    return new Promise<void>((resolve) => {
      const tryRun = () => {
        if (this.running < this.MAX_CONCURRENT) {
          this.running++;
          resolve();
        } else {
          this.pending.push(tryRun);
        }
      };
      tryRun();
    });
  }

  private releaseSlot() {
    this.running--;
    const next = this.pending.shift();
    if (next) next();
  }

  async add(name: string, data: any, _opts?: any) {
    if (name === "process-article" && data.article) {
      console.log(`[MockQueue] ${this.name} enqueued: ${data.article.title.substring(0, 40)}...`);
      await this.runWhenSlotAvailable();
      (async () => {
        try {
          const { processArticle } = await import("./processing");
          await processArticle(data.article, data.catMap, data.systemUserId);
        } catch (e) {
          console.error("[MockQueue] Direct process failed:", e);
        } finally {
          this.releaseSlot();
        }
      })();
    } else {
      console.log(`[MockQueue] ${this.name} received generic task: ${name}`);
    }
    return { id: "mock-id" };
  }

  async on() { return this; }
  async getWaitingCount() { return 0; }
  async getActiveCount() { return this.running; }
  async getDelayedCount() { return 0; }
  async getFailedCount() { return 0; }
}

// Cache queue instances — prevent re-creation on every property access
let _articleQueue: Queue | MockQueue | null = null;
let _heavyTaskQueue: Queue | MockQueue | null = null;
let _retroactiveMergeQueue: Queue | MockQueue | null = null;

function getArticleQueue(): Queue | MockQueue {
  if (!_articleQueue) {
    const useReal = !!(process.env.REDIS_URL && _isRedisAvailable);
    _articleQueue = useReal
      ? new Queue("article-processing", { connection: connection as any })
      : new MockQueue("article-processing");
  }
  return _articleQueue;
}

function getHeavyTaskQueue(): Queue | MockQueue {
  if (!_heavyTaskQueue) {
    const useReal = !!(process.env.REDIS_URL && _isRedisAvailable);
    _heavyTaskQueue = useReal
      ? new Queue("heavy-tasks", { connection: connection as any })
      : new MockQueue("heavy-tasks");
  }
  return _heavyTaskQueue;
}

export const articleQueue = new Proxy({} as any, {
  get: (_, prop) => {
    const target = getArticleQueue();
    const value = (target as any)[prop];
    return typeof value === "function" ? value.bind(target) : value;
  }
});

export const heavyTaskQueue = new Proxy({} as any, {
  get: (_, prop) => {
    const target = getHeavyTaskQueue();
    const value = (target as any)[prop];
    return typeof value === "function" ? value.bind(target) : value;
  }
});

function getRetroactiveMergeQueue(): Queue | MockQueue {
  if (!_retroactiveMergeQueue) {
    const useReal = !!(process.env.REDIS_URL && _isRedisAvailable);
    _retroactiveMergeQueue = useReal
      ? new Queue("retroactive-merge", { connection: connection as any })
      : new MockQueue("retroactive-merge");
  }
  return _retroactiveMergeQueue;
}

export const retroactiveMergeQueue = new Proxy({} as any, {
  get: (_, prop) => {
    const target = getRetroactiveMergeQueue();
    const value = (target as any)[prop];
    return typeof value === "function" ? value.bind(target) : value;
  }
});
