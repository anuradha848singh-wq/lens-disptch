/**
 * News Fetcher (Producer) — pulls live articles and enqueues them for processing.
 * Refactored to use BullMQ for scalable background processing.
 * 
 * Resilience features:
 *  - Exponential backoff retry (3 attempts) for every RSS fetch
 *  - Circuit breaker: auto-disables publishers after 10 consecutive failures
 *  - Enhanced structured logging with failure categorisation
 */

import { storage } from "./storage";
import { RSS_SOURCES, QUALITY_GATES } from "./rss-sources";
import Parser from "rss-parser";
import { articleQueue, heavyTaskQueue } from "./queue";
import { db } from "./db";
import { users, publishers as publishersTable, articles, clusters } from "../shared/schema";
import { recordFetchStart, recordFetchEnd, recordFetchSource } from "./metrics";
import { preIngestQualityGate, formatRejection } from "./quality-gate";
import { createHash } from "crypto";
import { embeddingService } from "./lib/embeddings-client";
import { eq, sql, and, desc, gte, lt, inArray } from "drizzle-orm";
import { timed } from "./benchmark-collector";

// Deduplication Caches (Scoped by Domain to ensure 20+ sources can cluster)
const PROCESSED_URL_HASHES = new Set<string>();
const PROCESSED_TITLE_SHINGLES = new Map<string, Set<string>>(); // Key: "domain:title"
const MAX_CACHE_SIZE = 200000;

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('www.')) hostname = hostname.slice(4);
    let pathname = parsed.pathname;
    if (pathname.endsWith('/')) pathname = pathname.slice(0, -1);
    return `${hostname}${pathname}`;
  } catch (e) {
    return url;
  }
}

function getShingles(text: string, k = 3): Set<string> {
  const words = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 2);
  const shingles = new Set<string>();
  for (let i = 0; i <= words.length - k; i++) {
    shingles.add(words.slice(i, i + k).join(" "));
  }
  return shingles;
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

// ─── Exponential Backoff Retry Wrapper ────────────────────────────────────────
const RETRY_CONFIG = { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 8000 };

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  sourceName: string
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      // Allow 304 Not Modified
      if (!response.ok && response.status !== 304) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return response;
    } catch (err: any) {
      lastError = err;
      const isRetryable = !err.message?.includes("404") && !err.message?.includes("403") && !err.message?.includes("304");
      if (attempt < RETRY_CONFIG.maxAttempts && isRetryable) {
        const delay = Math.min(
          RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1),
          RETRY_CONFIG.maxDelayMs
        );
        console.warn(
          `[Fetcher] [Retry] ${sourceName} attempt ${attempt}/${RETRY_CONFIG.maxAttempts} failed: ${err.message}. Retrying in ${delay}ms...`
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError || new Error(`Fetch failed after ${RETRY_CONFIG.maxAttempts} attempts`);
}

function categoriseError(err: any): string {
  const msg = (err.message || "").toLowerCase();
  if (msg.includes("timeout") || msg.includes("abort")) return "TIMEOUT";
  if (msg.includes("404")) return "NOT_FOUND";
  if (msg.includes("403") || msg.includes("401")) return "AUTH_BLOCKED";
  if (msg.includes("5") && msg.includes("http")) return "SERVER_ERROR";
  if (msg.includes("enotfound") || msg.includes("econnrefused")) return "DNS_OR_CONN";
  if (msg.includes("parse") || msg.includes("xml")) return "PARSE_ERROR";
  return "UNKNOWN";
}

// ─── Circuit Breaker ──────────────────────────────────────────────────────────
const CIRCUIT_BREAKER_THRESHOLD = 5; // 5 consecutive failures before auto-disable
const CIRCUIT_BREAKER_COOLDOWN = 5 * 60 * 1000; // 5 min cooldown
const sourceFailState = new Map<string, { count: number, lastFailure: number }>();

async function recordSourceSuccess(sourceName: string): Promise<void> {
  sourceFailState.delete(sourceName);
  // Reset failCount in DB if it was elevated
  try {
    const pub = await storage.getPublisherBySlug(sourceName.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    if (pub && pub.failCount > 0) {
      await db.update(publishersTable).set({ failCount: 0 }).where(eq(publishersTable.id, pub.id));
    }
  } catch (_) { }
}

async function recordSourceFailure(sourceName: string, sourceQuality: number = 60): Promise<boolean> {
  const current = sourceFailState.get(sourceName) || { count: 0, lastFailure: 0 };
  
  if (current.count >= CIRCUIT_BREAKER_THRESHOLD && Date.now() - current.lastFailure > CIRCUIT_BREAKER_COOLDOWN) {
    current.count = 0; // Cooldown expired, let's reset to allow a test fetch
  }
  
  current.count++;
  current.lastFailure = Date.now();
  sourceFailState.set(sourceName, current);

  if (current.count >= CIRCUIT_BREAKER_THRESHOLD) {
    console.error(`[Fetcher] [CircuitBreaker] ⚡ Source ${sourceName} hit ${current.count} failures — COOLDOWN for 5 minutes.`);
    return true; // circuit is open
  }

  // Persist fail count
  try {
    const slug = sourceName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const pub = await storage.getPublisherBySlug(slug);
    if (pub) {
      await db.update(publishersTable).set({ failCount: current.count }).where(eq(publishersTable.id, pub.id));
    }
  } catch (_) { }

  return false;
}

// RSS Source configuration
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  },
  customFields: {
    item: [["media:content", "media"], ["content:encoded", "contentEncoded"]],
  }
});

// Admin Control State
export const adminFetcherConfig = {
  isPaused: false,
  fetchIntervalMs: 10 * 60 * 1000,    // 10 minutes (was 30)
  algorithmIntervalMs: 10 * 60 * 1000 // 10 minutes
};

let lastFetchTime: string | null = null;
let totalArticlesEnqueued = 0;

export function getAdminFetcherStatus() {
  return {
    ...adminFetcherConfig,
    lastFetchTime,
    totalArticlesEnqueued,
    sourcesConfigured: Object.values(RSS_SOURCES).flat().length,
    queueActive: true
  };
}

export function updateAdminFetcherConfig(updates: Partial<typeof adminFetcherConfig>) {
  const oldInterval = adminFetcherConfig.fetchIntervalMs;
  Object.assign(adminFetcherConfig, updates);
  // Restart fetch timer if interval changed
  if (updates.fetchIntervalMs && updates.fetchIntervalMs !== oldInterval) {
    console.log(`[Fetcher] Interval changed from ${oldInterval}ms to ${updates.fetchIntervalMs}ms — restarting timer.`);
    stopAutoFetch();
    startAutoFetch();
  }
  console.log("[Fetcher] Admin config updated:", adminFetcherConfig);
  return adminFetcherConfig;
}

/**
 * Helper to process a specific set of sources sequentially (by chunk).
 */
async function processSourceBatch(
  sources: any[],
  catMap: Record<string, string>,
  systemUserId: string,
  biasTier: string,
  publishVolumeMap: Map<string, number>
): Promise<number> {
  if (sources.length === 0) {
    console.log(`[Fetcher] ${biasTier}: No sources to fetch.`);
    return 0;
  }

  const minQuality = QUALITY_GATES[biasTier] || 60;
  console.log(`[Fetcher] >>> STARTING ${biasTier} (Gate: ${minQuality}, ${sources.length} sources)`);
  if (biasTier === "pro_opposition" || biasTier === "TIER-1") recordFetchStart();
  let enqueuedBatch = 0;
  const CONCURRENCY_LIMIT = 5;

  for (let i = 0; i < sources.length; i += CONCURRENCY_LIMIT) {
    const chunk = sources.slice(i, i + CONCURRENCY_LIMIT);

    await Promise.all(chunk.map(async (source, index) => {
      let sourceStart = Date.now();
      let sourceEnqueued = 0;
      try {
        // --- Circuit Breaker Check ---
        const currentCB = sourceFailState.get(source.name);
        if (currentCB && currentCB.count >= CIRCUIT_BREAKER_THRESHOLD) {
           if (Date.now() - currentCB.lastFailure < CIRCUIT_BREAKER_COOLDOWN) {
             console.log(`[Fetcher] [CircuitBreaker] SKIP ${source.name} (in 5-min cooldown)`);
             return;
           }
        }

        await new Promise(resolve => setTimeout(resolve, index * 800));
        sourceStart = Date.now();
        console.log(`[Fetcher] [${biasTier}] Processing ${source.name}...`);
        const slug = source.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const pub = await storage.getPublisherBySlug(slug);

        if (pub) {
          const lastFetchedAt = pub.lastFetchedAt ? new Date(pub.lastFetchedAt).getTime() : 0;
          const minsSinceFetch = (Date.now() - lastFetchedAt) / 60000;

          // TIER INTERVAL BASED ON 7-DAY PUBLISH VOLUME (Post-circuit-breaker)
          const sevenDayVolume = publishVolumeMap.get(pub.id) || 0;
          let tierInterval = 60;
          
          if (sevenDayVolume > 150) {
            tierInterval = 10; // Extremely high volume -> 10m
          } else if (sevenDayVolume > 70) {
            tierInterval = 15; // High volume -> 15m
          } else if (sevenDayVolume > 20) {
            tierInterval = 30; // Medium volume -> 30m
          } else {
            // Fallback for low volume or new sources
            tierInterval = source.quality >= 90 ? 15 : (source.quality >= 75 ? 30 : 60);
          }

          if (minsSinceFetch < tierInterval) {
            console.log(`[Fetcher] [Tiering] SKIP ${source.name} (Quality ${source.quality}) — fetched ${Math.round(minsSinceFetch)}m ago, interval is ${tierInterval}m`);
            return;
          }
        }

        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        };

        // ── DIMENSION 7: CONDITIONAL GET (ETags) ──
        if (pub?.lastEtag) headers['If-None-Match'] = pub.lastEtag;
        if (pub?.lastModified) headers['If-Modified-Since'] = pub.lastModified;

        // ── Retry-wrapped fetch ──
        let response: Response;
        let feed: Parser.Output<any>;
        try {
          const fetchResult = await timed("Discovery", async () => {
            const res = await fetchWithRetry(source.url!, headers, source.name);
            if (res.status === 304) {
              return { is304: true, res, parsedFeed: null };
            }
            const xmlText = await res.text();
            const parsed = await parser.parseString(xmlText);
            return { is304: false, res, parsedFeed: parsed };
          });

          if (fetchResult.is304) {
            console.log(`[Fetcher] [ConditionalGet] 304 Not Modified for ${source.name}. Skipping.`);
            if (pub) {
              await db.update(publishersTable).set({ lastFetchedAt: new Date() }).where(eq(publishersTable.id, pub.id));
            }
            return;
          }
          response = fetchResult.res;
          feed = fetchResult.parsedFeed!;
        } catch (fetchErr) {
          throw fetchErr;
        }

        const newEtag = response.headers.get('etag');
        const newLastModified = response.headers.get('last-modified');

        // Update publisher fetch metadata
        if (pub) {
          await db.update(publishersTable).set({
            lastFetchedAt: new Date(),
            lastEtag: newEtag,
            lastModified: newLastModified
          }).where(eq(publishersTable.id, pub.id));
        }

        const validArticles: any[] = [];

        await timed("Pre-Ingestion Filter", async () => {
          // --- BATCH DB LOOKUP FOR ALL URLs IN FEED ---
          const feedUrls = feed.items.slice(0, 30).map(item => item.link || item.guid || "").filter(Boolean);
          const existingDbUrls = new Set<string>();
          if (feedUrls.length > 0) {
            try {
              const existingInDb = await db.select({ url: articles.url })
                .from(articles)
                .where(inArray(articles.url, feedUrls));
              existingInDb.forEach((a: any) => existingDbUrls.add(a.url));
            } catch (e) {
              console.error(`[Fetcher] Batched DB Dedup check failed for ${source.name}:`, e);
            }
          }

          for (const item of feed.items.slice(0, 30)) {
            const url = item.link || item.guid || "";
            if (!url || (url.endsWith('.html') && url.includes('/device/rss'))) continue;

            const pubDate = new Date(item.pubDate || "");
            if (!isNaN(pubDate.getTime()) && Date.now() - pubDate.getTime() > 5 * 24 * 60 * 60 * 1000) {
              console.log(`[Stage 0 Reject] Stale article (>5 days): ${item.title}`);
              continue;
            }

            // ── PRE-INGESTION QUALITY GATE ──
            const articleTitle = item.title || "";
            const articleDesc = item.contentSnippet || (item as any).description || "";
            const verdict = preIngestQualityGate(
              articleTitle,
              articleDesc,
              url,
              item.pubDate,
              source.quality,
              totalArticlesEnqueued < 50
            );

            if (!verdict.pass) {
              if (sourceEnqueued === 0 || Math.random() < 0.1) {
                console.log(formatRejection(articleTitle, source.name, verdict));
              }
              continue;
            }

            let domain = "";
            try {
              domain = new URL(url).hostname.replace('www.', '');
            } catch (e) {
              domain = "unknown";
            }

            const articleData: any = {
              title: item.title || "",
              description: item.contentSnippet || (item as any).description || "",
              url: url,
              domain: domain,
              image: item.enclosure?.url || (item as any).media?.["$"]?.url || null,
              publishedAt: item.pubDate || new Date().toISOString(),
              source: { name: source.name, url: source.url! },
              embedding: undefined,
              trace: {
                fetched: new Date().toISOString(),
                bias_tier: biasTier,
                publisher_quality: source.quality,
                publisher_warning: source.warning
              }
            };

            // --- DEDUP TIER 1: URL Hash ---
            const normUrl = normalizeUrl(url);
            const urlHash = createHash("sha256").update(normUrl).digest("hex");
            if (PROCESSED_URL_HASHES.has(urlHash)) {
              console.log(`[Stage 0 Reject] Duplicate URL Hash: ${url}`);
              continue;
            }

            // --- DEDUP TIER 2: Title Shingle ---
            const domainTitleKey = `${domain}:${articleData.title}`;
            if (PROCESSED_TITLE_SHINGLES.has(domainTitleKey)) {
              console.log(`[Stage 0 Reject] Duplicate Title Shingle: ${articleData.title}`);
              continue;
            }

            // --- DEDUP TIER 3: Database URL check (now batched) ---
            if (existingDbUrls.has(url)) {
              console.log(`[Stage 0 Reject] Duplicate in DB: ${url}`);
              PROCESSED_URL_HASHES.add(urlHash);
              continue;
            }

            validArticles.push(articleData);
          }
        });

        if (validArticles.length > 0) {
          // --- DEDUP TIER 4: E5 Semantic (BATCHED API call) ---
          const vectors = await timed("Embedding", async () => {
            return await embeddingService.embedBatch(
              validArticles.map(a => ({
                text: a.title + ". " + (a.description || ""),
                urlHash: createHash("sha256").update(normalizeUrl(a.url)).digest("hex")
              }))
            );
          });

          for (let i = 0; i < validArticles.length; i++) {
            const articleData = validArticles[i];
            const vector = vectors[i];

            if (vector) {
              articleData.embedding = vector;
            }

            const normUrlForHash = normalizeUrl(articleData.url);
            const urlHash = createHash("sha256").update(normUrlForHash).digest("hex");
            const domainTitleKey = `${articleData.domain}:${articleData.title}`;
            const currentShingles = getShingles(articleData.title);
            PROCESSED_URL_HASHES.add(urlHash);
            PROCESSED_TITLE_SHINGLES.set(domainTitleKey, currentShingles);

            if (PROCESSED_URL_HASHES.size > MAX_CACHE_SIZE) {
              const keys = [...PROCESSED_URL_HASHES].slice(0, 10000);
              keys.forEach(k => PROCESSED_URL_HASHES.delete(k));
            }
            if (PROCESSED_TITLE_SHINGLES.size > MAX_CACHE_SIZE) {
              const keys = [...PROCESSED_TITLE_SHINGLES.keys()].slice(0, 10000);
              keys.forEach(k => PROCESSED_TITLE_SHINGLES.delete(k));
            }

            try {
              await articleQueue.add("process-article", {
                article: articleData,
                catMap,
                systemUserId
              });
              sourceEnqueued++;
              enqueuedBatch++;
              totalArticlesEnqueued++;
            } catch (queueErr) {
              const { processArticle } = await import("./processing");
              await processArticle(articleData as any, catMap, systemUserId);
              sourceEnqueued++;
              enqueuedBatch++;
              totalArticlesEnqueued++;
            }
          }
        }

        // ── SUCCESS: reset circuit breaker ──
        await recordSourceSuccess(source.name);
        recordFetchSource({ source: source.name, tier: 1, status: "ok", articlesEnqueued: sourceEnqueued, durationMs: Date.now() - sourceStart });
        console.log(`[Fetcher] [${biasTier}] ✓ ${source.name} — ${sourceEnqueued} articles in ${Date.now() - sourceStart}ms`);

      } catch (err: any) {
        const errorType = categoriseError(err);
        console.warn(`[Fetcher] [${biasTier}] ✗ ${source.name} [${errorType}]: ${err.message}`);

        // ── Circuit breaker: track failure ──
        const circuitOpen = await recordSourceFailure(source.name, source.quality);
        if (circuitOpen) {
          console.warn(`[Fetcher] [CircuitBreaker] ${source.name} will be skipped in future cycles until re-enabled.`);
        }

        recordFetchSource({ source: source.name, tier: 1, status: "failed", articlesEnqueued: 0, errorMessage: `[${errorType}] ${err.message}`, durationMs: Date.now() - sourceStart });
      }
    }));
  }

  console.log(`[Fetcher] <<< FINISHED ${biasTier}. Enqueued ${enqueuedBatch} articles.`);
  return enqueuedBatch;
}

/**
 * Main fetch cycle - Tiered sequential processing
 */
export async function fetchRealNews(): Promise<number> {
  if (adminFetcherConfig.isPaused) return 0;

  console.log("[Fetcher] STARTING BUCKETED FETCH CYCLE...");
  lastFetchTime = new Date().toISOString();

  // Prepare context
  const categoriesList = await storage.listCategories();
  const catMap: Record<string, string> = {};
  categoriesList.forEach((c: any) => catMap[c.slug] = c.id);

  const systemUser = await storage.getUserByEmail("system@modernnews.com") ||
    await storage.getUserByEmail("system@newshub.com") ||
    await storage.getUserByEmail("admin@newshub.com") ||
    (await storage.listUsers())[0]; // Fallback to any user if seed failed

  if (!systemUser) {
    console.error("[Fetcher] FATAL: No users found in database. Run seed.ts first.");
    return 0;
  }

  let totalCycleEnqueued = 0;

  // PRE-CALCULATE 7-DAY PUBLISH VOLUME FOR FREQUENCY SCALING
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const volumeData = await db.execute(sql`
    SELECT source_id, COUNT(*)::int as count 
    FROM articles 
    WHERE published_at >= ${sevenDaysAgo.toISOString()} 
    GROUP BY source_id
  `);
  
  const publishVolumeMap = new Map<string, number>();
  volumeData.rows.forEach((row: any) => {
    publishVolumeMap.set(row.source_id, Number(row.count));
  });

  // Process in QUALITY-FIRST order:
  // 1. AGGREGATORS (AP, Reuters, BBC) — seed clusters with trusted wire sources
  // 2. CENTER — neutral sources build the backbone
  // 3. LEFT/RIGHT — attach viewpoints to existing clusters  
  // 4. FAR_LEFT/FAR_RIGHT — niche perspectives (strictest quality gate)
  for (const biasTier of Object.keys(RSS_SOURCES)) {
    const sources = RSS_SOURCES[biasTier] || [];
    // Sort sources within each tier by quality (highest first)
    const sorted = [...sources].sort((a, b) => b.quality - a.quality);
    totalCycleEnqueued += await processSourceBatch(sorted, catMap, systemUser.id, biasTier, publishVolumeMap);
  }

  console.log(`[Fetcher] BUCKETED CYCLE COMPLETE. Total: ${totalCycleEnqueued} articles.`);

  // Refresh homepage cache in background (Stale-while-revalidate)
  try {
    const { updateHomepageCache } = await import("./processing");
    updateHomepageCache().catch(e => console.error("[Fetcher] Background cache refresh failed:", e));
  } catch (e) {
    console.error("[Fetcher] Failed to initiate cache refresh:", e);
  }

  return totalCycleEnqueued;
}

function getAdaptiveInterval(): number {
  const hour = new Date().getHours();
  // Peak hours: morning (7-10 AM), afternoon (12-2 PM), and evening (7-11 PM)
  const isPeak = (hour >= 7 && hour <= 10) || (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 23);
  const isNight = hour >= 0 && hour <= 6;
  if (isPeak) return 5 * 60 * 1000;  // 5 mins
  if (isNight) return 60 * 60 * 1000; // 60 mins
  return 15 * 60 * 1000;              // 15 mins (standard)
}

let fetchInterval: NodeJS.Timeout | null = null;

export function startAutoFetch() {
  if (fetchInterval) return;
  console.log("[Fetcher] Auto-fetch started with Adaptive Timing.");

  const run = async () => {
    await fetchRealNews().catch(err => console.error("[Fetcher] Fetch failed:", err));
    const next = getAdaptiveInterval();
    console.log(`[Fetcher] Next adaptive fetch scheduled in ${next / 60000} minutes.`);
    fetchInterval = setTimeout(run, next);
  };
  fetchInterval = setTimeout(run, 0); // run immediately
}

export function stopAutoFetch() {
  if (fetchInterval) {
    clearTimeout(fetchInterval);
    fetchInterval = null;
    console.log("[Fetcher] Auto-fetch stopped.");
  }
}

export function addCustomSource(source: { publisherName: string, url: string }) {
  const newSource = {
    ...source,
    category: "general",
    region: "US"
  };
  if (!RSS_SOURCES.center) RSS_SOURCES.center = [];
  RSS_SOURCES.center.push(newSource as any);
  console.log(`[Fetcher] Added custom source: ${source.publisherName}`);
  // Fetch only this one source, not all sources
  fetchSingleSource(newSource).catch(err =>
    console.error("[Fetcher] Single source fetch failed:", err)
  );
}

async function fetchSingleSource(source: any) {
  const categories = await storage.listCategories();
  const catMap: Record<string, string> = {};
  categories.forEach((c: any) => catMap[c.slug] = c.id);
  const systemUser = await storage.getUserByEmail("system@modernnews.com") ||
    await storage.getUserByEmail("admin@newshub.com");
  if (!systemUser) return;
  await processSourceBatch([source], catMap, systemUser.id, "CUSTOM", new Map());
}

// ─────────────────────────────────────────────────────────────────────────────
// RECLUSTERING JOB — runs every 15 minutes
// Finds solo articles (sourceCount=1) published in last 24h and
// tries to match them to existing clusters or each other.
// ─────────────────────────────────────────────────────────────────────────────
export function startReclusteringJob() {
  console.log("[Recluster] Job started. Runs every 2 minutes.");
  setInterval(async () => {
    try {
      await runReclusteringPass();
    } catch (err) {
      console.error("[Recluster] Pass failed:", err);
    }
  }, 2 * 60 * 1000); // every 2 minutes
}

async function runReclusteringPass() {
  const solo = await db.select({
    id: articles.id,
    title: articles.title,
    excerpt: articles.excerpt,
    clusterId: articles.clusterId,
    sourceId: articles.sourceId,
    publishedAt: articles.publishedAt,
    url: articles.url,
    sourceUrl: articles.sourceUrl,
    embedding: sql<number[] | null>`ae.embedding`,
    sourceCount: sql<number>`COALESCE(clusters.source_count, 1)`
  })
    .from(articles)
    .leftJoin(sql`article_embeddings ae`, sql`ae.article_id = ${articles.id}`)
    .leftJoin(clusters, eq(articles.clusterId, clusters.id))
    .where(and(
      eq(articles.status, "published"),
      sql`${articles.visibilityState} IN ('visible', 'low_priority')`,
      sql`COALESCE(clusters.source_count, 1) = 1`
    ))
    .orderBy(desc(articles.publishedAt))
    .limit(1000);

  if (solo.length === 0) return;

  console.log(`[Recluster] Found ${solo.length} solo articles to re-examine...`);

  const categories = await storage.listCategories();
  const catMap: Record<string, string> = {};
  categories.forEach((c: any) => catMap[c.slug] = c.id);

  const systemUser = await storage.getUserByEmail("system@modernnews.com") ||
    await storage.getUserByEmail("admin@newshub.com");
  if (!systemUser) return;

  const { extractKeywords, extractEntities, extractTopicFingerprint, calculateWeightedEntitySimilarity } = await import("./processing");

  const candidates = await db.select({
    id: articles.id,
    title: articles.title,
    excerpt: articles.excerpt,
    clusterId: articles.clusterId,
    sourceId: articles.sourceId,
    publishedAt: articles.publishedAt,
    url: articles.url,
    sourceUrl: articles.sourceUrl,
    embedding: sql<number[] | null>`ae.embedding`
  })
    .from(articles)
    .leftJoin(sql`article_embeddings ae`, sql`ae.article_id = ${articles.id}`)
    .where(and(eq(articles.status, "published"), sql`${articles.visibilityState} IN ('visible', 'low_priority')`))
    .orderBy(desc(articles.publishedAt))
    .limit(2000);

  let merged = 0;
  for (const article of solo) {
    const artKeywords = extractKeywords(article.title);
    const artEntities = extractEntities(article.title, article.excerpt || "");
    const artPubTime = article.publishedAt ? new Date(article.publishedAt).getTime() : 0;

    // Try to find a better cluster for this solo article

    for (const candidate of candidates) {
      if (candidate.id === article.id) continue;
      if (candidate.clusterId === article.clusterId) continue;
      if ((candidate.sourceCount || 1) < 2) continue; // only merge into real clusters

      const candPubTime = candidate.publishedAt ? new Date(candidate.publishedAt).getTime() : 0;
      const timeDiff = Math.abs(artPubTime - candPubTime) / (1000 * 60 * 60);
      if (timeDiff > 168) continue; // 7 day window

      const candKeywords = extractKeywords(candidate.title);
      const candEntities = extractEntities(candidate.title, candidate.excerpt || "");

      const entityScore = calculateWeightedEntitySimilarity(artEntities, candEntities);

      const kwIntersect = Array.from(artKeywords).filter(w => candKeywords.has(w)).length;
      const kwUnion = new Set([...artKeywords, ...candKeywords]).size;
      const kwScore = kwUnion > 0 ? kwIntersect / kwUnion : 0;

      const fingerA = extractTopicFingerprint(article.title, article.excerpt || "");
      const fingerB = extractTopicFingerprint(candidate.title, candidate.excerpt || "");
      const fpIntersect = Array.from(fingerA).filter(w => fingerB.has(w)).length;
      const fpUnion = new Set([...fingerA, ...fingerB]).size;
      const fpScore = fpUnion > 0 ? fpIntersect / fpUnion : 0;

      // Recalibrated for better solo-article merging
      const composite = (entityScore * 0.40) + (kwScore * 0.35) + (fpScore * 0.25);
      let isMatch = composite >= 0.18;

      // --- VECTOR E5 SEMANTIC FALLBACK ---
      if (!isMatch && article.embedding && candidate.embedding) {
        const { calculateCosineSimilarity } = await import("../shared/schema");
        try {
          const v1 = typeof article.embedding === 'string' ? JSON.parse(article.embedding as any) : article.embedding;
          const v2 = typeof candidate.embedding === 'string' ? JSON.parse(candidate.embedding as any) : candidate.embedding;
          const cosSim = calculateCosineSimilarity(v1, v2);
          if (cosSim >= 0.82) {
            isMatch = true;
          }
        } catch (e) { }
      }

      if (isMatch && candidate.clusterId) {
        await storage.updateArticle(article.id, { clusterId: candidate.clusterId });
        merged++;
        console.log(`[Recluster] Merged "${article.title.substring(0, 40)}" → cluster ${candidate.clusterId.substring(0, 8)}`);
        break;
      }
    }

    // Small delay to not hammer the DB
    await new Promise(r => setTimeout(r, 50));
  }

  if (merged > 0) {
    console.log(`[Recluster] Pass complete. Merged ${merged} solo articles into existing clusters.`);
  }
}

