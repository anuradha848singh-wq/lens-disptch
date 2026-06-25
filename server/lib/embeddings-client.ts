import { db } from "../db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { connection as redis, isRedisConnected } from "../queue";

const JINA_API_KEY = process.env.JINA_API_KEY;

// Circuit breaker state
let failures = 0;
let openUntil = 0;

export function isCircuitOpen(): boolean {
  return Date.now() < openUntil;
}

function recordSuccess() {
  failures = 0;
}

function recordFailure() {
  failures++;
  if (failures >= 3) {
    openUntil = Date.now() + 30_000; // Open for 30 seconds
    failures = 0;
    console.warn("[Jina] Circuit breaker TRIPPED! API calls paused for 30s.");
    console.error(JSON.stringify({ type: 'circuit_open', service: 'jina', at: Date.now() }));
  }
}

function md5(text: string): string {
  return crypto.createHash("md5").update(text).digest("hex");
}

export interface SimilarArticle {
  id: string;
  title: string;
  score: number;
  bias: string;
  publisher: string;
  published_at: string;
}

async function getPythonEmbeddingFallback(texts: string[]): Promise<(number[] | null)[]> {
  try {
    const response = await fetch("http://127.0.0.1:5005/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts }),
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.embeddings)) {
        return data.embeddings.map((e: any) => (e && e.length === 384) ? e : null);
      }
    }
  } catch (err: any) {
    console.warn("[Embeddings] Python fallback failed:", err.message);
  }
  return texts.map(() => null);
}

async function getJinaEmbedding(text: string): Promise<number[] | null> {
  if (isCircuitOpen()) {
    console.log("[Jina] Circuit is open. Falling back to Python.");
    const fallback = await getPythonEmbeddingFallback([text]);
    return fallback[0];
  }

  const cacheKey = `embed:${md5(text)}`;

  if (isRedisConnected()) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as number[];
      }
    } catch (cacheErr: any) {
      console.warn("[Embeddings] Redis get failed:", cacheErr.message);
    }
  }

  if (!JINA_API_KEY) {
    console.warn("[Embeddings] JINA_API_KEY is not configured. Falling back to Python.");
    const fallback = await getPythonEmbeddingFallback([text]);
    return fallback[0];
  }

  try {
    const response = await fetch("https://api.jina.ai/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${JINA_API_KEY}`,
      },
      body: JSON.stringify({
        model: "jina-embeddings-v3",
        dimensions: 384,
        task: "retrieval.passage",
        input: [text.substring(0, 1000)], // Cap to prevent exceeding payload limits
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.warn(`[Embeddings] Jina API returned HTTP ${response.status}`);
      recordFailure();
      return null;
    }
    const data = await response.json();
    if (data && data.data && data.data[0] && data.data[0].embedding) {
      const embedding = data.data[0].embedding as number[];
      if (embedding.length !== 384) {
        console.warn(`[Embeddings] Expected 384 dims, got ${embedding.length}`);
        return null;
      }
      recordSuccess();

      if (isRedisConnected()) {
        try {
          await redis.setex(cacheKey, 86400, JSON.stringify(embedding)); // Cache for 24 hours
        } catch (cacheErr: any) {
          console.warn("[Embeddings] Redis setex failed:", cacheErr.message);
        }
      }
      return embedding;
    }
    recordFailure();
    const fallback = await getPythonEmbeddingFallback([text]);
    return fallback[0];
  } catch (err: any) {
    console.error("[Embeddings] Jina API request failed:", err.message);
    recordFailure();
    const fallback = await getPythonEmbeddingFallback([text]);
    return fallback[0];
  }
}

export async function getJinaEmbeddingBatch(items: string[] | { text: string, urlHash?: string }[]): Promise<(number[] | null)[]> {
  if (items.length === 0) return [];

  const results: (number[] | null)[] = new Array(items.length).fill(null);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];
  const cacheKeys: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const text = typeof item === 'string' ? item : item.text;
    const urlHash = typeof item === 'object' && item.urlHash ? item.urlHash : md5(text);
    cacheKeys.push(`embed:${urlHash}`);
  }

  if (isRedisConnected()) {
    try {
      const cachedValues = await redis.mget(...cacheKeys);
      for (let i = 0; i < items.length; i++) {
        const val = cachedValues[i];
        if (val) {
          results[i] = JSON.parse(val) as number[];
        } else {
          uncachedIndices.push(i);
          const item = items[i];
          uncachedTexts.push(typeof item === 'string' ? item : item.text);
        }
      }
    } catch (cacheErr: any) {
      console.warn("[Embeddings] Redis mget failed:", cacheErr.message);
      for (let i = 0; i < items.length; i++) {
        uncachedIndices.push(i);
        const item = items[i];
        uncachedTexts.push(typeof item === 'string' ? item : item.text);
      }
    }
  } else {
    for (let i = 0; i < items.length; i++) {
      uncachedIndices.push(i);
      const item = items[i];
      uncachedTexts.push(typeof item === 'string' ? item : item.text);
    }
  }

  if (uncachedTexts.length === 0) {
    return results;
  }

  if (isCircuitOpen() || !JINA_API_KEY) {
    if (!JINA_API_KEY) console.warn("[Embeddings] JINA_API_KEY is not configured.");
    else console.log(`[Jina] Circuit is open. Falling back to Python for batch of ${uncachedTexts.length}.`);
    
    // Chunk Python fallback too just in case
    for (let i = 0; i < uncachedTexts.length; i += 32) {
      const chunk = uncachedTexts.slice(i, i + 32);
      const fallbacks = await getPythonEmbeddingFallback(chunk);
      for (let j = 0; j < fallbacks.length; j++) {
        if (fallbacks[j] && fallbacks[j]!.length === 384) {
          results[uncachedIndices[i + j]] = fallbacks[j];
        }
      }
    }
    return results;
  }

  const batches = [];
  for (let i = 0; i < uncachedTexts.length; i += 32) {
    batches.push(uncachedTexts.slice(i, i + 32));
  }

  try {
    const pipeline = isRedisConnected() ? redis.pipeline() : null;
    let currentBatchOffset = 0;

    for (const batchTexts of batches) {
      const response = await fetch("https://api.jina.ai/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${JINA_API_KEY}`,
        },
        body: JSON.stringify({
          model: "jina-embeddings-v3",
          dimensions: 384,
          task: "retrieval.passage",
          input: batchTexts.map(t => t.substring(0, 1000)),
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.warn(`[Embeddings] Jina API batch returned HTTP ${response.status}`);
        recordFailure();
        // Fallback for this batch
        const fallbacks = await getPythonEmbeddingFallback(batchTexts);
        for (let j = 0; j < fallbacks.length; j++) {
          if (fallbacks[j] && fallbacks[j]!.length === 384) {
            results[uncachedIndices[currentBatchOffset + j]] = fallbacks[j];
          }
        }
        currentBatchOffset += batchTexts.length;
        continue;
      }

      const data = await response.json();
      if (data && data.data && Array.isArray(data.data)) {
        recordSuccess();

        for (const item of data.data) {
          if (item && typeof item.index === "number" && item.embedding) {
            const adjustedIndex = item.index + currentBatchOffset;
            const originalIndex = uncachedIndices[adjustedIndex];
            const embedding = item.embedding as number[];
            
            if (embedding.length === 384) {
              results[originalIndex] = embedding;

              if (pipeline) {
                const cacheKey = cacheKeys[originalIndex];
                pipeline.setex(cacheKey, 86400, JSON.stringify(embedding));
              }
            }
          }
        }
      } else {
        recordFailure();
      }
      
      currentBatchOffset += batchTexts.length;
    } // end batches loop

    if (pipeline) {
      try {
        await pipeline.exec();
      } catch (pipelineErr: any) {
        console.warn("[Embeddings] Redis pipeline exec failed:", pipelineErr.message);
      }
    }

    return results;
  } catch (err: any) {
    console.error("[Embeddings] Jina API batch request failed:", err.message);
    recordFailure();
    
    // Final fallback for all uncached texts
    for (let i = 0; i < uncachedTexts.length; i += 32) {
      const chunk = uncachedTexts.slice(i, i + 32);
      const fallbacks = await getPythonEmbeddingFallback(chunk);
      for (let j = 0; j < fallbacks.length; j++) {
        if (fallbacks[j] && fallbacks[j]!.length === 384) {
          results[uncachedIndices[i + j]] = fallbacks[j];
        }
      }
    }
    return results;
  }
}

export const embeddingService = {
  async embedBatch(items: string[] | { text: string, urlHash?: string }[]): Promise<(number[] | null)[]> {
    return await getJinaEmbeddingBatch(items);
  },

  // Called when a new article is saved
  async embedArticle(article: { id: string; title: string; excerpt?: string | null; embedding?: number[] | null }) {
    try {
      let embedding = article.embedding;
      if (!embedding) {
        const text = `${article.title}. ${article.excerpt || ""}`;
        embedding = await getJinaEmbedding(text);
      }
      if (embedding) {
        const vecStr = `[${embedding.join(",")}]`;
        await db.execute(sql`
          INSERT INTO article_embeddings (article_id, embedding)
          VALUES (${article.id}, ${vecStr}::vector)
          ON CONFLICT (article_id) DO UPDATE SET embedding = EXCLUDED.embedding
        `);
        console.log(`[Embeddings] Successfully stored Jina embedding for article ${article.id}`);
      }
    } catch (err: any) {
      console.error(`[Embeddings] Failed to embed article ${article.id}:`, err.message);
    }
  },

  // Called when loading article detail page
  async getSimilar(articleId: string, topK = 20): Promise<SimilarArticle[]> {
    try {
      const result = await db.execute(sql`
        WITH target AS (
          SELECT embedding FROM article_embeddings WHERE article_id = ${articleId} LIMIT 1
        )
        SELECT 
          a.id, 
          a.title, 
          (1 - (ae.embedding <=> target.embedding)) as score, 
          p.bias_rating as bias, 
          p.name as publisher, 
          a.published_at
        FROM article_embeddings ae
        INNER JOIN articles a ON a.id = ae.article_id
        INNER JOIN publishers p ON p.id = a.source_id
        CROSS JOIN target
        WHERE ae.article_id != ${articleId}
        ORDER BY ae.embedding <=> target.embedding ASC
        LIMIT ${topK}
      `);
      if (!result.rows) return [];
      return result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        score: Number(row.score),
        bias: row.bias || "neutral",
        publisher: row.publisher,
        published_at: row.published_at ? new Date(row.published_at).toISOString() : new Date().toISOString()
      }));
    } catch (err: any) {
      console.error(`[Embeddings] getSimilar failed for ${articleId}:`, err.message);
      return [];
    }
  },

  // Called from search bar
  async search(query: string, biasFilter?: string) {
    try {
      const embedding = await getJinaEmbedding(query);
      if (!embedding) return [];
      const vecStr = `[${embedding.join(",")}]`;
      const result = await db.execute(sql`
        SELECT 
          a.id, 
          a.title, 
          (1 - (ae.embedding <=> ${vecStr}::vector)) as score, 
          p.bias_rating as bias, 
          p.name as publisher, 
          a.published_at
        FROM article_embeddings ae
        INNER JOIN articles a ON a.id = ae.article_id
        INNER JOIN publishers p ON p.id = a.source_id
        WHERE 1 - (ae.embedding <=> ${vecStr}::vector) > 0.6
        ORDER BY ae.embedding <=> ${vecStr}::vector ASC
        LIMIT 15
      `);
      if (!result.rows) return [];
      let mapped = result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        score: Number(row.score),
        bias: row.bias || "neutral",
        publisher: row.publisher,
        published_at: row.published_at ? new Date(row.published_at).toISOString() : new Date().toISOString()
      }));
      if (biasFilter) {
        mapped = mapped.filter((m: any) => m.bias.toLowerCase() === biasFilter.toLowerCase());
      }
      return mapped;
    } catch (err: any) {
      console.error("[Embeddings] search failed:", err.message);
      return [];
    }
  },

  // Called on article ingest — before saving
  async isDuplicate(article: { id?: string; title: string; excerpt?: string | null }) {
    try {
      const embedding = await getJinaEmbedding(`${article.title}. ${article.excerpt || ""}`);
      if (!embedding) return { is_duplicate: false };
      const vecStr = `[${embedding.join(",")}]`;
      const result = await db.execute(sql`
        SELECT ae.article_id, a.domain, (1 - (ae.embedding <=> ${vecStr}::vector)) as similarity
        FROM article_embeddings ae
        INNER JOIN articles a ON a.id = ae.article_id
        WHERE 1 - (ae.embedding <=> ${vecStr}::vector) > 0.85
        ORDER BY ae.embedding <=> ${vecStr}::vector ASC
        LIMIT 1
      `);
      if (result.rows && result.rows.length > 0) {
        const match = result.rows[0] as any;
        return {
          is_duplicate: true,
          duplicate_of_domain: match.domain,
          vector: embedding
        };
      }
      return { is_duplicate: false, vector: embedding };
    } catch (err: any) {
      console.error("[Embeddings] isDuplicate check failed:", err.message);
      return { is_duplicate: false };
    }
  },

  async isDuplicateWithVector(vector: number[], domain: string) {
    try {
      const vecStr = `[${vector.join(",")}]`;
      const result = await db.execute(sql`
        SELECT ae.article_id, a.domain, (1 - (ae.embedding <=> ${vecStr}::vector)) as similarity
        FROM article_embeddings ae
        INNER JOIN articles a ON a.id = ae.article_id
        WHERE 1 - (ae.embedding <=> ${vecStr}::vector) > 0.85
        ORDER BY ae.embedding <=> ${vecStr}::vector ASC
        LIMIT 1
      `);
      if (result.rows && result.rows.length > 0) {
        const match = result.rows[0] as any;
        return {
          is_duplicate: true,
          duplicate_of_domain: match.domain
        };
      }
      return { is_duplicate: false };
    } catch (err: any) {
      console.error("[Embeddings] isDuplicateWithVector check failed:", err.message);
      return { is_duplicate: false };
    }
  },
};

export async function getEmbedding(text: string): Promise<number[] | null> {
  return await getJinaEmbedding(text);
}
