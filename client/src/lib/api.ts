import { 
  type ArticleWithDetails, 
  type Publisher, 
  type Category, 
  type Tag, 
  type MyBiasStats, 
  type ReadingHistoryEntry, 
  type UserPreference, 
  type ShareEvent, 
  type SystemSettings,
  type Cluster
} from "@shared/schema";

const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const start = performance.now();
  const method = options?.method || "GET";
  let statusCode = 0;

  try {
    const res = await fetch(BASE + path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
    });
    statusCode = res.status;
    const durationMs = Math.round(performance.now() - start);

    // Log failures and slow calls
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      // Dynamic import to avoid circular deps on initial load
      import("./logger").then(({ logApiCall }) => {
        logApiCall(path, method, statusCode, durationMs, err.error);
      }).catch(() => {});
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    // Log slow successful calls
    if (durationMs > 3000) {
      import("./logger").then(({ logApiCall }) => {
        logApiCall(path, method, statusCode, durationMs);
      }).catch(() => {});
    }

    return res.json();
  } catch (error: any) {
    if (statusCode === 0) {
      // Network error — no response received
      const durationMs = Math.round(performance.now() - start);
      import("./logger").then(({ logApiCall }) => {
        logApiCall(path, method, 0, durationMs, error.message);
      }).catch(() => {});
    }
    throw error;
  }
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: any; profile: any }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, displayName: string) =>
      request<{ user: any; profile: any }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      }),
    logout: () => request("/api/auth/logout", { method: "POST" }),
    me: () => request<{ user: any; profile: any }>("/api/auth/me"),
  },

  articles: {
    list: (params: {
      status?: string;
      category?: string;
      bias?: string;
      search?: string;
      publisherId?: string;
      limit?: number;
      offset?: number;
    }) => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
      return request<{ articles: ArticleWithDetails[]; total: number }>(`/api/articles?${q}`);
    },
    get: (id: string) => request<ArticleWithDetails>(`/api/articles/${id}`),
    getFull: (id: string) => request<{
      article: ArticleWithDetails;
      cluster: any;
      deepIntelligence: any;
      related: ArticleWithDetails[];
      similar: ArticleWithDetails[];
      publisherArticles: { articles: ArticleWithDetails[]; total: number };
    }>(`/api/articles/${id}/full`),
    related: (id: string) => request<ArticleWithDetails[]>(`/api/articles/${id}/related`),
    similar: (id: string) => request<ArticleWithDetails[]>(`/api/articles/${id}/similar`),
    create: (data: any) => request<any>("/api/articles", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/api/articles/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    publish: (id: string) =>
      request<any>(`/api/articles/${id}/publish`, { method: "POST" }),
    delete: (id: string) =>
      request<any>(`/api/articles/${id}`, { method: "DELETE" }),
    trending: (limit: number = 10) =>
      request<ArticleWithDetails[]>(`/api/articles/trending?limit=${limit}`),
    homepage: (limit: number = 50, offset: number = 0, search?: string, category?: string) => {
      const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (search) q.set("search", search);
      if (category) q.set("category", category);
      return request<ArticleWithDetails[]>(`/api/homepage?${q}`);
    },
    forYou: (limit: number = 20, offset: number = 0) =>
      request<ArticleWithDetails[]>(`/api/articles/for-you?limit=${limit}&offset=${offset}`),
    share: (id: string, platform: string = "copy") =>
      request<ShareEvent>(`/api/articles/${id}/share`, {
        method: "POST",
        body: JSON.stringify({ platform }),
      }),
    listByPublisher: (publisherId: string, limit: number = 5) => 
      request<{ articles: ArticleWithDetails[]; total: number }>(`/api/publishers/${publisherId}/articles?limit=${limit}`),
    listByCategory: (categoryId: string, limit: number = 6) => 
      request<{ articles: ArticleWithDetails[]; total: number }>(`/api/articles?category=${categoryId}&limit=${limit}`),
    getFullContent: (id: string) => 
      request<{ fullContent: string }>(`/api/articles/${id}/full-content`),
    discoverSources: (articleId: string) =>
      request<any>(`/api/sources?articleId=${articleId}`),
  },

  publishers: {
    list: () => request<Publisher[]>("/api/publishers"),
    get: (id: string) => request<Publisher>(`/api/publishers/${id}`),
    create: (data: any) =>
      request<Publisher>("/api/publishers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<Publisher>(`/api/publishers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<any>(`/api/publishers/${id}`, { method: "DELETE" }),
    radar: (id: string) =>
      request<{ reliability: number; uniqueness: number; consistency: number; correction: number; transparency: number }>(
        `/api/publishers/${id}/radar`
      ),
    fingerprint: (id: string) =>
      request<{ alarming: number; tense: number; neutral: number; calm: number; hopeful: number; total: number }>(
        `/api/publishers/${id}/fingerprint`
      ),
  },

  categories: {
    list: () => request<Category[]>("/api/categories"),
    create: (data: any) =>
      request<Category>("/api/categories", { method: "POST", body: JSON.stringify(data) }),
  },

  tags: {
    list: () => request<Tag[]>("/api/tags"),
    create: (data: any) => request<Tag>("/api/tags", { method: "POST", body: JSON.stringify(data) }),
  },

  bookmarks: {
    list: () => request<ArticleWithDetails[]>("/api/bookmarks"),
    add: (articleId: string) =>
      request<any>("/api/bookmarks", { method: "POST", body: JSON.stringify({ articleId }) }),
    remove: (articleId: string) =>
      request<any>(`/api/bookmarks/${articleId}`, { method: "DELETE" }),
  },

  // The Lens Dispatch features
  blindspot: () =>
    request<{ leftBlindspot: ArticleWithDetails[]; rightBlindspot: ArticleWithDetails[] }>("/api/blindspot"),

  myBias: () => request<MyBiasStats>("/api/my-bias"),

  history: (limit: number = 20) =>
    request<(ReadingHistoryEntry & { article: ArticleWithDetails })[]>(`/api/history?limit=${limit}`),

  preferences: {
    get: () => request<UserPreference>("/api/preferences"),
    update: (data: Partial<UserPreference>) =>
      request<UserPreference>("/api/preferences", { method: "PUT", body: JSON.stringify(data) }),
  },
  
  settings: {
    get: () => request<SystemSettings>("/api/settings"),
    update: (data: Partial<SystemSettings>) =>
      request<SystemSettings>("/api/settings", { method: "PATCH", body: JSON.stringify(data) }),
  },

  health: () => request<{ status: string; timestamp: string }>("/api/health"),

  upload: async (file: File) => {
    const form = new FormData();
    form.append("image", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json() as Promise<{ url: string }>;
  },

  clusters: {
    get: (clusterId: string) =>
      request<Cluster>(`/api/clusters/${clusterId}`),
    compare: (clusterId: string) => 
      request<{ pro_establishment: ArticleWithDetails[]; neutral: ArticleWithDetails[]; pro_opposition: ArticleWithDetails[] }>(`/api/clusters/${clusterId}/compare`),
    timeline: (clusterId: string) =>
      request<ArticleWithDetails[]>(`/api/clusters/${clusterId}/timeline`),
    trending: () => 
      request<any[]>("/api/trending"),
    blindspots: () => 
      request<any[]>("/api/blindspots"),
    impact: (id: string) =>
      request<{ reach: number; velocity: number; depth: number; sourceCount: number; category: string }>(
        `/api/clusters/${id}/impact`
      ),
    deep: (id: string) =>
      request<{
        id: string;
        headline: string;
        summary: string;
        origin: { publisher: Publisher; publishedAt: string };
        intelligence: {
          sdi: number;
          geography: Record<string, number>;
          sourceCount: number;
          blindspotScore: number;
          blindspotSide: "left" | "right" | null;
        };
        articles: ArticleWithDetails[];
      }>(`/api/clusters/${id}/deep`),
    foreignGaze: (id: string) =>
      request<{ available: boolean; domestic_summary?: string; foreign_summary?: string; difference?: string; domestic_sources?: string[]; foreign_sources?: string[]; message?: string }>(`/api/clusters/${id}/foreign-gaze`),
    briefing: (id: string) =>
      request<{ available: boolean; summary?: string; key_players?: string[]; timeline?: string[]; discrepancies?: string[]; message?: string }>(`/api/clusters/${id}/briefing`),
    entities: (id: string) =>
      request<{ quotes: { entity: string; quote: string; topic?: string; source?: string }[]; count: number }>(`/api/clusters/${id}/entities`),
    marketImpact: (id: string) =>
      request<{ tickers: string[]; analysis: string }>(`/api/clusters/${id}/market-impact`),
  },

  admin: {
    getStatus: () => request<any>("/api/admin/fetcher"),
    updateConfig: (config: any) =>
      request<any>("/api/admin/fetcher", { method: "POST", body: JSON.stringify(config) }),
    addSource: (source: any) =>
      request<any>("/api/admin/source", { method: "POST", body: JSON.stringify(source) }),
    triggerFetch: () =>
      request<any>("/api/admin/fetcher/run", { method: "POST" }),
  },
  
  analytics: {
    heatCalendar: (categorySlug: string, days = 365) =>
      request<{ category: string; days: { date: string; count: number }[]; maxCount: number }>(
        `/api/analytics/heat/${categorySlug}?days=${days}`
      ),
    sentimentRiver: (categorySlug: string, days: number = 30) =>
      request<{ date: string; alarming: number; tense: number; neutral: number; calm: number; hopeful: number }[]>(
        `/api/analytics/sentiment/${categorySlug}?days=${days}`
      ),
    droughts: () =>
      request<{ category: string; slug: string; hoursSinceLast: number; severity: "high" | "medium" }[]>(
        "/api/analytics/droughts"
      ),
  },

  social: {
    getComments: (clusterId: string) => request<any[]>(`/api/social/clusters/${clusterId}/comments`),
    postComment: (clusterId: string, data: { content: string; parentId?: string | null; isAnonymous: boolean }) =>
      request<any>(`/api/social/clusters/${clusterId}/comments`, { method: "POST", body: JSON.stringify(data) }),
    voteComment: (commentId: string, value: number) =>
      request<{ success: boolean; upvotes: number; downvotes: number }>(`/api/social/comments/${commentId}/vote`, { method: "POST", body: JSON.stringify({ value }) }),
    rateCluster: (clusterId: string, data: { ratingType: "bias" | "factuality"; ratingValue: string }) =>
      request<{ success: boolean }>(`/api/social/clusters/${clusterId}/rate`, { method: "POST", body: JSON.stringify(data) }),
    getProfile: (userId: string) =>
      request<{ profile: any; stats: MyBiasStats }>(`/api/social/profiles/${userId}`),
  }
};
