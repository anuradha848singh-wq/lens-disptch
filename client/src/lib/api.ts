import { 
  type ArticleWithDetails, 
  type Publisher, 
  type Category, 
  type Tag, 
  type MyBiasStats, 
  type ReadingHistoryEntry, 
  type UserPreference, 
  type ShareEvent, 
  type SystemSettings 
} from "@shared/schema";

const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
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
      limit?: number;
      offset?: number;
    }) => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
      return request<{ articles: ArticleWithDetails[]; total: number }>(`/api/articles?${q}`);
    },
    get: (id: string) => request<ArticleWithDetails>(`/api/articles/${id}`),
    related: (id: string) => request<ArticleWithDetails[]>(`/api/articles/${id}/related`),
    create: (data: any) => request<any>("/api/articles", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/api/articles/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    publish: (id: string) =>
      request<any>(`/api/articles/${id}/publish`, { method: "POST" }),
    delete: (id: string) =>
      request<any>(`/api/articles/${id}`, { method: "DELETE" }),
    trending: (limit: number = 10) =>
      request<ArticleWithDetails[]>(`/api/articles/trending?limit=${limit}`),
    forYou: (limit: number = 20) =>
      request<ArticleWithDetails[]>(`/api/articles/for-you?limit=${limit}`),
    share: (id: string, platform: string = "copy") =>
      request<ShareEvent>(`/api/articles/${id}/share`, {
        method: "POST",
        body: JSON.stringify({ platform }),
      }),
    listByPublisher: (publisherId: string, limit: number = 5) => 
      request<{ articles: ArticleWithDetails[]; total: number }>(`/api/articles?publisherId=${publisherId}&limit=${limit}`),
    listByCategory: (categoryId: string, limit: number = 6) => 
      request<{ articles: ArticleWithDetails[]; total: number }>(`/api/articles?categoryId=${categoryId}&limit=${limit}`),
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

  // Ground News features
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
};
