import { connection as redis } from "./queue";

// TTL is 5 minutes in seconds
const DEFAULT_TTL = 300; 

export const CACHE_KEYS = {
  ARTICLES_LATEST: "articles:latest",
  ARTICLE_BY_ID: (id: string) => `article:${id}`,
  ARTICLE_BY_SLUG: (slug: string) => `article_slug:${slug}`,
  CLUSTER_BY_ID: (id: string) => `cluster:${id}`,
  TRENDING_ARTICLES: "articles:trending",
  SOURCE_BIAS: "source:bias_stats",
  SIMILAR_ARTICLES: (id: string) => `similar:${id}`,   // same event, 5 min TTL
  RELATED_ARTICLES: (id: string) => `related:${id}`,   // same topic, 10 min TTL
};

/**
 * High-level caching utility for the tiered architecture.
 */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      console.error(`[Cache] Error getting key ${key}:`, err);
      return null;
    }
  },

  async set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await redis.set(key, serialized, "EX", ttl);
    } catch (err) {
      console.error(`[Cache] Error setting key ${key}:`, err);
    }
  },

  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (err) {
      console.error(`[Cache] Error deleting key ${key}:`, err);
    }
  },

  /**
   * Helper to get or fetch data from the database.
   */
  async fetch<T>(key: string, fn: () => Promise<T>, ttl: number = DEFAULT_TTL): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) {
      // Don't return cached empty arrays — they poison the cache and show blank pages
      if (Array.isArray(cached) && cached.length === 0) {
        await this.delete(key);
      } else {
        return cached;
      }
    }

    const fresh = await fn();
    if (fresh && !(Array.isArray(fresh) && fresh.length === 0)) {
      await this.set(key, fresh, ttl);
    }
    return fresh;
  },

  /**
   * Clears multiple keys at once by pattern (use sparingly).
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      console.error(`[Cache] Error invalidating pattern ${pattern}:`, err);
    }
  }
};
