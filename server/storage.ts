import { 
  type User, type InsertUser, type UserProfile, type InsertUserProfile,
  type Publisher, type InsertPublisher,
  type Cluster, type InsertCluster,
  type Category, type InsertCategory,
  type Tag, type InsertTag,
  type Article, type InsertArticle, type ArticleWithDetails, type ArticleStatus, type Bias,
  type ArticleView, type InsertArticleView,
  type Bookmark, type InsertBookmark,
  type Session, type InsertSession,
  type ReadingHistoryEntry, type UserPreference, type ShareEvent, type MyBiasStats,
  type SystemSettings, type InsertSystemSettings,
  type FetchQueue,
  users, userProfiles, publishers, clusters, categories, tags, 
  articles, articleCategories, articleTags, articleViews, 
  bookmarks, sessions, readingHistory, 
  userPreferences, shareEvents, systemSettings
} from "../shared/schema";
import { db, isDbConnected } from "./db";
import { cache, CACHE_KEYS } from "./cache";
import { eq, and, or, like, desc, sql, inArray, gte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { calculateCosineSimilarity } from "../shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser, profile: InsertUserProfile): Promise<{ user: User; profile: UserProfile }>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile>;
  
  getPublisher(id: string): Promise<Publisher | undefined>;
  getPublisherBySlug(slug: string): Promise<Publisher | undefined>;
  listPublishers(): Promise<Publisher[]>;
  createPublisher(publisher: InsertPublisher): Promise<Publisher>;
  updatePublisher(id: string, data: Partial<Publisher>): Promise<Publisher>;
  deletePublisher(id: string): Promise<void>;

  getCluster(id: string): Promise<Cluster | undefined>;
  listClusters(): Promise<Cluster[]>;
  createCluster(cluster: InsertCluster): Promise<Cluster>;
  updateCluster(id: string, data: Partial<Cluster>): Promise<Cluster>;
  deleteCluster(id: string): Promise<void>;
  
  getCategory(id: string): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  listCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, data: Partial<Category>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  
  getTag(id: string): Promise<Tag | undefined>;
  getTagBySlug(slug: string): Promise<Tag | undefined>;
  listTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  
  getArticle(id: string): Promise<ArticleWithDetails | undefined>;
  getArticleBySlug(slug: string): Promise<ArticleWithDetails | undefined>;
  getRelatedArticles(id: string): Promise<ArticleWithDetails[]>;
  getSimilarArticles(id: string): Promise<ArticleWithDetails[]>;
  listArticles(params: {
    status?: ArticleStatus;
    sourceId?: string;
    categoryId?: string;
    bias?: Bias;
    search?: string;
    clusterId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ articles: ArticleWithDetails[]; total: number }>;
  listAllArticlesRaw(limit?: number): Promise<ArticleWithDetails[]>;
  createArticle(article: InsertArticle, categoryIds: string[], tagIds: string[]): Promise<Article>;
  updateArticle(id: string, data: Partial<Article>, categoryIds?: string[], tagIds?: string[]): Promise<Article>;
  deleteArticle(id: string): Promise<void>;
  publishArticle(id: string): Promise<Article>;
  
  trackArticleView(view: InsertArticleView): Promise<ArticleView>;
  getArticleViews(articleId: string): Promise<number>;
  
  isBookmarked(userId: string, articleId: string): Promise<boolean>;
  addBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  removeBookmark(userId: string, articleId: string): Promise<void>;
  getUserBookmarks(userId: string): Promise<ArticleWithDetails[]>;
  
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  deleteSession(id: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;

  // Ground News advanced features
  getTrendingArticles(limit: number): Promise<ArticleWithDetails[]>;
  getHomepageClusters(limit?: number): Promise<any[]>;
  getHomepageSlots(): Promise<Record<string, any[]>>;
  getBlindspotArticles(): Promise<{ leftBlindspot: ArticleWithDetails[]; rightBlindspot: ArticleWithDetails[] }>;
  trackReadingHistory(userId: string, articleId: string): Promise<ReadingHistoryEntry>;
  getReadingHistory(userId: string, limit: number): Promise<(ReadingHistoryEntry & { article: ArticleWithDetails })[]>;
  getMyNewsBias(userId: string): Promise<MyBiasStats>;
  getUserPreferences(userId: string): Promise<UserPreference | undefined>;
  updateUserPreferences(userId: string, data: Partial<UserPreference>): Promise<UserPreference>;
  trackShare(articleId: string, userId: string | null, platform: string): Promise<ShareEvent>;
  getArticleShareCount(articleId: string): Promise<number>;
  getForYouArticles(userId: string, limit: number): Promise<ArticleWithDetails[]>;
  updateArticleContent(id: string, bodyHtml: string): Promise<void>;
  
  getSystemSettings(): Promise<SystemSettings>;
  updateSystemSettings(data: Partial<SystemSettings>): Promise<SystemSettings>;
  resetFetchQueue(): Promise<void>;
  findSimilarArticles(embedding: number[], options?: { limit?: number; threshold?: number }): Promise<Article[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private userProfiles: Map<string, UserProfile>;
  private publishers: Map<string, Publisher>;
  private clusters: Map<string, Cluster>;
  private categories: Map<string, Category>;
  private tags: Map<string, Tag>;
  private articles: Map<string, Article>;
  private articleCategories: Map<string, string[]>;
  private articleTags: Map<string, string[]>;
  private articleViews: Map<string, ArticleView[]>;
  private bookmarks: Map<string, Set<string>>;
  private sessions: Map<string, Session>;
  // Ground News features
  private readingHistoryStore: ReadingHistoryEntry[];
  private userPreferencesStore: Map<string, UserPreference>;
  private shareEventsStore: ShareEvent[];
  private systemSettingsStore: SystemSettings;
  private fetchQueueStore: Map<string, FetchQueue>;
  // Secondary indexes — O(1) lookups replacing O(n) Array.from().find() scans
  private usersByEmail: Map<string, User>;
  private publishersBySlug: Map<string, Publisher>;
  private articlesBySlug: Map<string, Article>;
  private articlesByCluster: Map<string, Set<string>>;
  private tagsBySlug: Map<string, Tag>;
  private shareCountByArticle: Map<string, number>;
  private clusterSourceCount: Map<string, Set<string>>;

  constructor() {
    this.users = new Map();
    this.userProfiles = new Map();
    this.publishers = new Map();
    this.clusters = new Map();
    this.categories = new Map();
    this.tags = new Map();
    this.articles = new Map();
    this.articleCategories = new Map();
    this.articleTags = new Map();
    this.articleViews = new Map();
    this.bookmarks = new Map();
    this.sessions = new Map();
    this.readingHistoryStore = [];
    this.userPreferencesStore = new Map();
    this.shareEventsStore = [];
    this.fetchQueueStore = new Map();
    // Initialize secondary indexes
    this.usersByEmail = new Map();
    this.publishersBySlug = new Map();
    this.articlesBySlug = new Map();
    this.articlesByCluster = new Map();
    this.tagsBySlug = new Map();
    this.shareCountByArticle = new Map();
    this.clusterSourceCount = new Map();
    this.systemSettingsStore = {
      id: "global",
      fetchCountry: "US",
      fetchLanguage: "en",
      localNewsKeywords: "Global",
      activeTopics: [],
      useBrowserLocation: false,
      updatedAt: new Date()
    };
    
    this.initializeDefaults();
  }

  private initializeDefaults() {
    const categoryData = [
      { name: "Politics", slug: "politics" },
      { name: "Business", slug: "business" },
      { name: "Technology", slug: "technology" },
      { name: "Sports", slug: "sports" },
      { name: "World", slug: "world" },
      { name: "Health", slug: "health" },
      { name: "Entertainment", slug: "entertainment" },
    ];
    
    categoryData.forEach(cat => {
      const id = cat.slug; 
      this.categories.set(id, {
        id,
        name: cat.name,
        slug: cat.slug,
        description: null,
        createdAt: new Date(),
      });
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.usersByEmail.get(email);
  }

  async createUser(insertUser: InsertUser, insertProfile: InsertUserProfile): Promise<{ user: User; profile: UserProfile }> {
    const id = randomUUID();
    const user: User = {
      id,
      email: insertUser.email,
      passwordHash: insertUser.passwordHash,
      role: insertUser.role || "editor",
      status: insertUser.status || "active",
      preferences: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    this.usersByEmail.set(user.email, user);

    const profile: UserProfile = {
      userId: id,
      displayName: insertProfile.displayName,
      avatarUrl: insertProfile.avatarUrl || null,
      bio: insertProfile.bio || null,
      joinDate: new Date(),
      balanceScore: 50,
      isPublic: false,
      updatedAt: new Date(),
    };
    this.userProfiles.set(id, profile);

    return { user, profile };
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    const updated = { ...user, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    return this.userProfiles.get(userId);
  }

  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const profile = this.userProfiles.get(userId);
    if (!profile) throw new Error("Profile not found");
    const updated = { ...profile, ...data, updatedAt: new Date() };
    this.userProfiles.set(userId, updated);
    return updated;
  }

  async getPublisher(id: string): Promise<Publisher | undefined> {
    return this.publishers.get(id);
  }

  async getPublisherBySlug(slug: string): Promise<Publisher | undefined> {
    return this.publishersBySlug.get(slug);
  }

  async listPublishers(): Promise<Publisher[]> {
    return Array.from(this.publishers.values());
  }

  async createPublisher(insertPublisher: InsertPublisher): Promise<Publisher> {
    const id = insertPublisher.slug; // Deterministic ID for publishers
    const publisher: Publisher = {
      ...insertPublisher,
      id,
      description: insertPublisher.description || null,
      logoUrl: insertPublisher.logoUrl || null,
      website: insertPublisher.website || null,
      rssUrl: insertPublisher.rssUrl || null,
      biasRating: insertPublisher.biasRating || null,
      factualityRating: insertPublisher.factualityRating || null,
      ownerName: insertPublisher.ownerName || null,
      promoterGroup: insertPublisher.promoterGroup || null,
      ownerType: insertPublisher.ownerType || null,
      country: insertPublisher.country || "US",
      language: insertPublisher.language || "en",
      active: true,
      failCount: 0,
      lastFetchedAt: insertPublisher.lastFetchedAt || null,
      factualityTier: insertPublisher.factualityTier || null,
      mbfcRating: insertPublisher.mbfcRating || null,
      mbfcUrl: insertPublisher.mbfcUrl || null,
      newsguardScore: insertPublisher.newsguardScore || null,
      ifcnSignatory: insertPublisher.ifcnSignatory ?? false,
      hasCorrectionsPolicy: insertPublisher.hasCorrectionsPolicy ?? false,
      hasOwnershipDisclosure: insertPublisher.hasOwnershipDisclosure ?? false,
      hasOpinionLabeling: insertPublisher.hasOpinionLabeling ?? false,
      hasCorrectionsArchive: insertPublisher.hasCorrectionsArchive ?? false,
      communityFlags: insertPublisher.communityFlags ?? 0,
      factualityLastUpdated: insertPublisher.factualityLastUpdated || null,
      lastEtag: null,
      lastModified: insertPublisher.lastModified || null,
      reliabilityScore: insertPublisher.reliabilityScore ?? 60,
      factualityScore: insertPublisher.factualityScore ?? null,
      uniquenessScore: insertPublisher.uniquenessScore ?? 50,
      correctionRate: insertPublisher.correctionRate ?? 0,
      consistencyScore: insertPublisher.consistencyScore ?? 70,
      lastReliabilityUpdate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.publishers.set(id, publisher);
    this.publishersBySlug.set(publisher.slug, publisher);
    return publisher;
  }

  async updatePublisher(id: string, data: Partial<Publisher>): Promise<Publisher> {
    const publisher = this.publishers.get(id);
    if (!publisher) throw new Error("Publisher not found");
    const updated = { ...publisher, ...data, updatedAt: new Date() } as Publisher;
    this.publishers.set(id, updated);
    this.publishersBySlug.set(updated.slug, updated);
    return updated;
  }

  async deletePublisher(id: string): Promise<void> {
    const publisher = this.publishers.get(id);
    if (publisher) this.publishersBySlug.delete(publisher.slug);
    this.publishers.delete(id);
  }

  async getCluster(id: string): Promise<Cluster | undefined> {
    return this.clusters.get(id);
  }

  async listClusters(): Promise<Cluster[]> {
    return Array.from(this.clusters.values()).sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime());
  }

  async createCluster(insertCluster: InsertCluster): Promise<Cluster> {
    const id = insertCluster.id || randomUUID();
    const cluster: Cluster = {
      ...insertCluster,
      id,
      headline: insertCluster.headline,
      summary: insertCluster.summary || null,
      firstSeenAt: new Date(),
      lastUpdatedAt: new Date(),
      sourceCount: insertCluster.sourceCount || 0,
      proEstablishmentCount: insertCluster.proEstablishmentCount || 0,
      neutralCount: insertCluster.neutralCount || 0,
      proOppositionCount: insertCluster.proOppositionCount || 0,
      regionalAlignedCount: insertCluster.regionalAlignedCount || 0,
      importanceScore: insertCluster.importanceScore ?? 0,
      velocityScore: insertCluster.velocityScore ?? 0,
      qualityScore: insertCluster.qualityScore ?? 0,
      divergenceScore: insertCluster.divergenceScore ?? 0,
      confidenceScore: insertCluster.confidenceScore ?? 50,
      narrativeLabel: (insertCluster.narrativeLabel as any) || "developing",
      categorySlug: insertCluster.categorySlug || null,
      storyPhase: (insertCluster.storyPhase as any) || "developing",
      trendingScore: insertCluster.trendingScore ?? 0,
      blindspotScore: insertCluster.blindspotScore ?? 0,
      blindspotSide: (insertCluster.blindspotSide as any) || null,
      hasCorrection: insertCluster.hasCorrection ?? false,
      correctionNote: insertCluster.correctionNote || null,
      aiSummary: (insertCluster.aiSummary || []) as string[],
      aiFramingDiff: insertCluster.aiFramingDiff || null,
      aiEnrichedAt: insertCluster.aiEnrichedAt ? new Date(insertCluster.aiEnrichedAt) : null,
      aiForeignGaze: (insertCluster as any).aiForeignGaze || null,
      aiMarketTickers: (insertCluster as any).aiMarketTickers || null,
      aiEntityQuotes: (insertCluster as any).aiEntityQuotes || [],
      aiExecutiveBriefing: (insertCluster as any).aiExecutiveBriefing || null,
      geographyAggs: (insertCluster.geographyAggs || {}) as Record<string, number>,
      shannonDiversity: insertCluster.shannonDiversity || 0,
      originPublisherId: insertCluster.originPublisherId || null,
      originPublishedAt: insertCluster.originPublishedAt ? new Date(insertCluster.originPublishedAt) : null,
    };
    this.clusters.set(id, cluster);
    return cluster;
  }
  async updateCluster(id: string, data: Partial<Cluster>): Promise<Cluster> {
    const cluster = this.clusters.get(id);
    if (!cluster) throw new Error("Cluster not found");
    const updated = { ...cluster, ...data, lastUpdatedAt: new Date() };
    this.clusters.set(id, updated);
    return updated;
  }

  async deleteCluster(id: string): Promise<void> {
    this.clusters.delete(id);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    return this.categories.get(slug); // categories already use slug as ID key
  }

  async listCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async createCategory(insertCategory: any): Promise<Category> {
    const id = insertCategory.id || insertCategory.slug; 
    const category: Category = {
      id,
      name: insertCategory.name,
      slug: insertCategory.slug,
      description: insertCategory.description || null,
      createdAt: new Date(),
    };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const category = this.categories.get(id);
    if (!category) throw new Error("Category not found");
    const updated = { ...category, ...data };
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    this.categories.delete(id);
  }

  async getTag(id: string): Promise<Tag | undefined> {
    return this.tags.get(id);
  }

  async getTagBySlug(slug: string): Promise<Tag | undefined> {
    return this.tagsBySlug.get(slug);
  }

  async listTags(): Promise<Tag[]> {
    return Array.from(this.tags.values());
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const id = insertTag.slug; 
    const tag: Tag = {
      id,
      ...insertTag,
      createdAt: new Date(),
    };
    this.tags.set(id, tag);
    this.tagsBySlug.set(tag.slug, tag);
    return tag;
  }

  private async enrichArticle(article: Article): Promise<ArticleWithDetails> {
    const source = await this.getPublisher(article.sourceId);
    const categoryIds = this.articleCategories.get(article.id) || [];
    const tagIds = this.articleTags.get(article.id) || [];
    const views = this.articleViews.get(article.id) || [];
    const shareCount = this.shareCountByArticle.get(article.id) || 0;

    // Count how many publishers cover a similar topic 
    // O(1) lookup using the clusterSourceCount index
    let sourceCount = 1;
    if (article.clusterId) {
      const sourceSet = this.clusterSourceCount.get(article.clusterId);
      if (sourceSet) {
        sourceCount = sourceSet.size;
      } else {
        // Fallback: build it if missing (should not happen if index is maintained)
        const clusterIds = this.articlesByCluster.get(article.clusterId) || new Set();
        const sources = new Set<string>();
        for (const id of clusterIds) {
          const a = this.articles.get(id);
          if (a && a.status === "published") sources.add(a.sourceId);
        }
        this.clusterSourceCount.set(article.clusterId, sources);
        sourceCount = sources.size;
      }
    }

    // Derive bias label: prefer numeric biasScore, fall back to publisher's biasRating string
    let biasLabel: string;
    if (article.biasScore !== null && article.biasScore !== undefined) {
      biasLabel = article.biasScore < -20 ? "left" : (article.biasScore > 20 ? "right" : "center");
    } else if (source?.biasRating) {
      const r = source.biasRating.toLowerCase();
      biasLabel = r.includes("left") ? "left" : r.includes("right") ? "right" : "center";
    } else {
      biasLabel = "center";
    }

    return {
      ...article,
      publisher: source || { id: article.sourceId, name: "Unknown", slug: "unknown" } as any,
      categories: (categoryIds.map(id => this.categories.get(id)!).filter(Boolean) as any),
      tags: (tagIds.map(id => this.tags.get(id)!).filter(Boolean) as any),
      bias: biasLabel as any,
      viewCount: views.length,
      shareCount,
      sourceCount,
    };
  }

  async getArticle(id: string): Promise<ArticleWithDetails | undefined> {
    const article = this.articles.get(id);
    if (!article) return undefined;
    return this.enrichArticle(article);
  }

  async getArticleBySlug(slug: string): Promise<ArticleWithDetails | undefined> {
    const article = this.articlesBySlug.get(slug);
    if (!article) return undefined;
    return this.enrichArticle(article);
  }

  // Similar = same cluster (same event, different sources)
  async getSimilarArticles(id: string): Promise<ArticleWithDetails[]> {
    const article = this.articles.get(id);
    if (!article || !article.clusterId) return [];
    const similar = Array.from(this.articles.values())
      .filter(a => a.clusterId === article.clusterId && a.id !== id && a.status === "published")
      .sort((a, b) => (b.publishedAt || b.createdAt).getTime() - (a.publishedAt || a.createdAt).getTime())
      .slice(0, 10);
    return Promise.all(similar.map(a => this.enrichArticle(a)));
  }

  // Related = different cluster, same category (topically connected but different event)
  async getRelatedArticles(id: string): Promise<ArticleWithDetails[]> {
    const article = this.articles.get(id);
    if (!article) return [];
    const articleCatIds = new Set(this.articleCategories.get(id) || []);
    if (articleCatIds.size === 0) return [];
    const related = Array.from(this.articles.values())
      .filter(a => {
        if (a.id === id || a.status !== "published") return false;
        if (article.clusterId && a.clusterId === article.clusterId) return false;
        const cats = this.articleCategories.get(a.id) || [];
        return cats.some(c => articleCatIds.has(c));
      })
      .sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0))
      .slice(0, 6);
    return Promise.all(related.map(a => this.enrichArticle(a)));
  }

  async listArticles(params: {
    status?: ArticleStatus;
    sourceId?: string;
    categoryId?: string;
    bias?: Bias;
    search?: string;
    clusterId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ articles: ArticleWithDetails[]; total: number }> {
    let filtered = Array.from(this.articles.values());
    const catObj = params.categoryId ? this.categories.get(params.categoryId) : null;
    console.log(`[MemStorage] listArticles: total articles in memory=${filtered.length}, category=${catObj ? catObj.name : 'ALL'}, params=${JSON.stringify(params)}`);

    if (params.status) {
      filtered = filtered.filter(a => a.status === params.status);
    }
    if (params.sourceId) {
      filtered = filtered.filter(a => a.sourceId === params.sourceId);
    }
    if (params.categoryId) {
      filtered = filtered.filter(a => {
        const cats = this.articleCategories.get(a.id) || [];
        return cats.includes(params.categoryId!);
      });
    }

    // Re-enabled bias filter using biasScore (numeric) with publisher biasRating fallback
    if (params.bias) {
      filtered = filtered.filter(a => {
        let biasLabel = "center";
        if (a.biasScore !== null && a.biasScore !== undefined) {
          biasLabel = a.biasScore < -15 ? "left" : a.biasScore > 15 ? "right" : "center";
        } else {
          const pub = this.publishers.get(a.sourceId);
          if (pub?.biasRating) {
            const r = pub.biasRating.toLowerCase();
            biasLabel = r.includes("left") ? "left" : r.includes("right") ? "right" : "center";
          }
        }
        return biasLabel === params.bias;
      });
    }

    if (params.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(search) ||
        (a.bodyClean || "").toLowerCase().includes(search)
      );
    }

    // Filter by clusterId if provided (for AI insight engine full coverage)
    if (params.clusterId) {
      filtered = filtered.filter(a => a.clusterId === params.clusterId);
    } 
    // ONLY deduplicate by cluster if we are NOT already filtering for a specific cluster
    else {
      // Pick the MOST IMPORTANT article per cluster (by importanceScore then recency)
      const clusterMap = new Map<string, Article>();
      filtered.forEach(article => {
        const cid = article.clusterId || article.id;
        const existing = clusterMap.get(cid);
        if (!existing) {
          clusterMap.set(cid, article);
        } else {
          // Prefer higher importance, then more recent
          const impA = article.importanceScore || 0;
          const impB = existing.importanceScore || 0;
          if (impA > impB || (impA === impB && (article.publishedAt || article.createdAt) > (existing.publishedAt || existing.createdAt))) {
            clusterMap.set(cid, article);
          }
        }
      });
      filtered = Array.from(clusterMap.values());
    }

    filtered.sort((a, b) => {
      const dateA = a.publishedAt || a.createdAt;
      const dateB = b.publishedAt || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });

    const total = filtered.length;
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    const paginated = filtered.slice(offset, offset + limit);

    const enriched = await Promise.all(paginated.map(a => this.enrichArticle(a)));
    return { articles: enriched, total };
  }

  async listAllArticlesRaw(limit: number = 5000): Promise<ArticleWithDetails[]> {
    const published = Array.from(this.articles.values())
      .filter(a => a.status === "published")
      .sort((a, b) => {
        const dateA = a.publishedAt || a.createdAt;
        const dateB = b.publishedAt || b.createdAt;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit);
    return Promise.all(published.map(a => this.enrichArticle(a)));
  }

  async createArticle(insertArticle: InsertArticle, categoryIds: string[], tagIds: string[]): Promise<Article> {
    const id = insertArticle.id || randomUUID();
    const { trace, ...articleData } = insertArticle;
    const article: Article = {
      ...articleData,
      id,
      status: insertArticle.status || "published",
      sourceId: insertArticle.sourceId,
      clusterId: insertArticle.clusterId || null,
      title: insertArticle.title,
      slug: insertArticle.slug,
      bodyClean: insertArticle.bodyClean || null,
      excerpt: insertArticle.excerpt || null,
      bodyHtml: insertArticle.bodyHtml,
      fullContent: insertArticle.fullContent || null,
      url: insertArticle.url,
      sourceUrl: insertArticle.sourceUrl || null,
      heroImageUrl: insertArticle.heroImageUrl || null,
      biasScore: insertArticle.biasScore !== undefined ? insertArticle.biasScore : null,
      biasHistory: (insertArticle.biasHistory as any) || [],
      aiInsights: (insertArticle.aiInsights as any) || [],
      isEmbedded: insertArticle.isEmbedded ?? false,
      importanceScore: insertArticle.importanceScore ?? 0,
      qualityScore: insertArticle.qualityScore ?? 0,
      readabilityScore: insertArticle.readabilityScore ?? null,
      visibilityState: insertArticle.visibilityState || "visible",
      embedding: (insertArticle.embedding as any) || null,
      entities: (insertArticle.entities as any) || null,
      domain: insertArticle.domain || null,
      trace: trace || {},
      publishedAt: insertArticle.publishedAt ? new Date(insertArticle.publishedAt) : new Date(),
      fetchedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.articles.set(id, article);
    this.articleCategories.set(id, categoryIds);
    this.articleTags.set(id, tagIds);
    this.articlesBySlug.set(article.slug, article);
    // Update cluster index
    if (article.clusterId) {
      if (!this.articlesByCluster.has(article.clusterId)) {
        this.articlesByCluster.set(article.clusterId, new Set());
      }
      this.articlesByCluster.get(article.clusterId)!.add(article.id);

      // Update source count index
      if (!this.clusterSourceCount.has(article.clusterId)) {
        this.clusterSourceCount.set(article.clusterId, new Set());
      }
      if (article.status === "published") {
        this.clusterSourceCount.get(article.clusterId)!.add(article.sourceId);
      }
    }
    return article;
  }

  async updateArticle(id: string, data: Partial<Article>, categoryIds?: string[], tagIds?: string[]): Promise<Article> {
    const article = this.articles.get(id);
    if (!article) throw new Error("Article not found");
    const updated = {
      ...article,
      ...data,
      clusterId: data.clusterId !== undefined ? data.clusterId : article.clusterId,
      updatedAt: new Date(),
    };
    this.articles.set(id, updated);
    if (categoryIds) this.articleCategories.set(id, categoryIds);
    if (tagIds) this.articleTags.set(id, tagIds);

    // Sync cluster indices if clusterId changed
    if (data.clusterId && data.clusterId !== article.clusterId) {
      // Remove from old
      if (article.clusterId) {
        this.articlesByCluster.get(article.clusterId)?.delete(id);
        // Re-calculate source count for old cluster is expensive, but clusterId changes are rare
        const oldClusterIds = this.articlesByCluster.get(article.clusterId) || new Set();
        const sources = new Set<string>();
        for (const aid of oldClusterIds) {
          const a = this.articles.get(aid);
          if (a && a.status === "published") sources.add(a.sourceId);
        }
        this.clusterSourceCount.set(article.clusterId, sources);
      }
      // Add to new
      if (!this.articlesByCluster.has(data.clusterId)) this.articlesByCluster.set(data.clusterId, new Set());
      this.articlesByCluster.get(data.clusterId)!.add(id);
      
      if (!this.clusterSourceCount.has(data.clusterId)) this.clusterSourceCount.set(data.clusterId, new Set());
      if (updated.status === "published") {
        this.clusterSourceCount.get(data.clusterId)!.add(updated.sourceId);
      }
    }
    return updated;
  }

  async deleteArticle(id: string): Promise<void> {
    const article = this.articles.get(id);
    if (article) {
      this.articlesBySlug.delete(article.slug);
      if (article.clusterId) {
        this.articlesByCluster.get(article.clusterId)?.delete(id);
      }
    }
    this.articles.delete(id);
    this.articleCategories.delete(id);
    this.articleTags.delete(id);
    this.articleViews.delete(id);
  }

  async publishArticle(id: string): Promise<Article> {
    const article = this.articles.get(id);
    if (!article) throw new Error("Article not found");
    const published = { ...article, status: "published" as ArticleStatus, publishedAt: new Date(), updatedAt: new Date() };
    this.articles.set(id, published);
    return published;
  }

  async trackArticleView(insertView: InsertArticleView): Promise<ArticleView> {
    const view: ArticleView = {
      id: randomUUID(),
      articleId: insertView.articleId,
      viewerId: insertView.viewerId || null,
      viewedAt: new Date(),
      referrer: insertView.referrer || null,
      metadata: insertView.metadata || null,
    };
    const views = this.articleViews.get(insertView.articleId) || [];
    views.push(view);
    this.articleViews.set(insertView.articleId, views);
    return view;
  }

  async getArticleViews(articleId: string): Promise<number> {
    const views = this.articleViews.get(articleId) || [];
    return views.length;
  }

  async isBookmarked(userId: string, articleId: string): Promise<boolean> {
    const userBookmarks = this.bookmarks.get(userId);
    return userBookmarks ? userBookmarks.has(articleId) : false;
  }

  async addBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    const userBookmarks = this.bookmarks.get(insertBookmark.userId) || new Set();
    userBookmarks.add(insertBookmark.articleId);
    this.bookmarks.set(insertBookmark.userId, userBookmarks);
    return { ...insertBookmark, createdAt: new Date() };
  }

  async removeBookmark(userId: string, articleId: string): Promise<void> {
    const userBookmarks = this.bookmarks.get(userId);
    if (userBookmarks) {
      userBookmarks.delete(articleId);
    }
  }

  async getUserBookmarks(userId: string): Promise<ArticleWithDetails[]> {
    const bookmarkIds = this.bookmarks.get(userId) || new Set<string>();
    const articles = Array.from(bookmarkIds).map((id: string) => this.articles.get(id)).filter(Boolean) as Article[];
    return Promise.all(articles.map((a: any) => this.enrichArticle(a)));
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const session: Session = {
      id,
      userId: insertSession.userId,
      refreshTokenHash: insertSession.refreshTokenHash,
      expiresAt: insertSession.expiresAt,
      userAgent: insertSession.userAgent || null,
      ipAddress: insertSession.ipAddress || null,
      createdAt: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    Array.from(this.sessions.entries()).forEach(([id, session]) => {
      if (session.userId === userId) {
        this.sessions.delete(id);
      }
    });
  }

  // --- Ground News Advanced Features ---

  async getTrendingArticles(limit: number = 10): Promise<ArticleWithDetails[]> {
    const published = Array.from(this.articles.values()).filter(a => a.status === "published");
    const now = Date.now();

    // Score = views * recency_multiplier (newer articles get boosted)
    published.sort((a, b) => {
      const viewsA = (this.articleViews.get(a.id) || []).length;
      const viewsB = (this.articleViews.get(b.id) || []).length;
      const ageHoursA = (now - (a.publishedAt || a.createdAt).getTime()) / (1000 * 60 * 60);
      const ageHoursB = (now - (b.publishedAt || b.createdAt).getTime()) / (1000 * 60 * 60);
      // Recency decay: articles older than 72h get progressive penalty
      const recencyA = Math.max(0.1, 1 - (ageHoursA / 72));
      const recencyB = Math.max(0.1, 1 - (ageHoursB / 72));
      const scoreA = (viewsA + 1) * recencyA + (a.importanceScore || 0) * 0.1;
      const scoreB = (viewsB + 1) * recencyB + (b.importanceScore || 0) * 0.1;
      return scoreB - scoreA;
    });

    const top = published.slice(0, limit);
    return Promise.all(top.map(a => this.enrichArticle(a)));
  }

  async getHomepageClusters(limit: number = 50): Promise<any[]> {
    const rawClusters = Array.from(this.clusters.values())
      .filter(c => c.sourceCount >= 1)
      .sort((a, b) => {
        const impA = (a as any).importanceScore || 0;
        const impB = (b as any).importanceScore || 0;
        if (impB !== impA) return impB - impA;
        if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount;
        return b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime();
      });

    const diverseClusters = this.applyDiversityGuard(rawClusters, limit);
      
    const results = [];
    for (const cluster of diverseClusters) {
      const clusterIds = this.articlesByCluster.get(cluster.id) || new Set();
      const clusterArticles = Array.from(clusterIds)
        .map(id => this.articles.get(id))
        .filter((a): a is Article => !!a && a.status === "published")
        .sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0));
        
      if (clusterArticles.length > 0) {
        const enriched = await this.enrichArticle(clusterArticles[0]);
        let proEstablishmentCount = 0, neutralCount = 0, proOppositionCount = 0;
        for (const ca of clusterArticles) {
          const pub = this.publishers.get(ca.sourceId);
          const r = (pub?.biasRating || "").toLowerCase();
          if (r.includes("left")) proEstablishmentCount++;
          else if (r.includes("right")) proOppositionCount++;
          else neutralCount++;
        }
        const total = clusterArticles.length;
        results.push({
          ...enriched,
          isCluster: true,
          clusterId: cluster.id,
          sourceCount: cluster.sourceCount || total,
          headline: cluster.headline || enriched.title,
          clusterSummary: cluster.summary,
          proEstablishmentCount,
          neutralCount,
          proOppositionCount,
          totalSources: total,
          importanceScore: (cluster as any).importanceScore || 0
        });
      }
    }
    return results;
  }

  /**
   * Diversity Guard: Prevents a single category or bias from dominating the homepage.
   * Allocates limited "slots" for categories and ensures bias representation.
   */
  private applyDiversityGuard(clusters: Cluster[], limit: number): Cluster[] {
    const selected: Cluster[] = [];
    const categoryCounts = new Map<string, number>();
    const MAX_PER_CATEGORY = Math.ceil(limit / 4); // Don't let one category take more than 25% of slots
    
    // Track bias of the "lead" article for each cluster
    const biasBalance = { left: 0, center: 0, right: 0 };

    for (const c of clusters) {
      if (selected.length >= limit) break;

      // Determine category of this cluster (from its lead article)
      const clusterIds = this.articlesByCluster.get(c.id);
      if (!clusterIds || clusterIds.size === 0) continue;
      
      const leadArtId = Array.from(clusterIds)[0];
      const leadArt = this.articles.get(leadArtId);
      if (!leadArt) continue;

      const catIds = this.articleCategories.get(leadArt.id) || [];
      const primaryCat = catIds.length > 0 ? catIds[0] : "uncategorized";

      // 1. Category Diversity Slot Check
      const currentCatCount = categoryCounts.get(primaryCat) || 0;
      if (currentCatCount >= MAX_PER_CATEGORY && clusters.length > limit * 2) {
        // Only skip if we have plenty of other options, to ensure we still fill the page
        continue;
      }

      // 2. Bias Balance (Subtle nudge)
      const pub = this.publishers.get(leadArt.sourceId);
      const r = (pub?.biasRating || "center").toLowerCase();
      const biasNum = r.includes("left") ? "left" : (r.includes("right") ? "right" : "center");

      // Nudge: if we already have 60% of one bias, deprioritize it unless it's very important
      const biasTotal = biasBalance.left + biasBalance.center + biasBalance.right;
      if (biasTotal > 10) {
        const biasShare = biasBalance[biasNum as keyof typeof biasBalance] / biasTotal;
        const importance = (c as any).importanceScore || 0;
        if (biasShare > 0.6 && importance < 70) continue;
      }

      // ALL CHECKS PASSED: Allocate Slot
      selected.push(c);
      categoryCounts.set(primaryCat, currentCatCount + 1);
      biasBalance[biasNum as keyof typeof biasBalance]++;
      
      if (selected.length === 1) {
        console.log(`[DiversityGuard] Slot 1 allocated to lead story: ${c.headline?.substring(0, 30)}... [${primaryCat}]`);
      }
    }

    console.log(`[DiversityGuard] Homepage generation: catMix=${JSON.stringify(Object.fromEntries(categoryCounts))}, biasMix=${JSON.stringify(biasBalance)}`);
    return selected;
  }

  async getBlindspotArticles(): Promise<{ leftBlindspot: ArticleWithDetails[]; rightBlindspot: ArticleWithDetails[] }> {
    const published = Array.from(this.articles.values()).filter(a => a.status === "published");
    
    // Use biasScore (numeric) with threshold, fall back to publisher biasRating
    const leftOnly = published.filter(a => {
      if (a.biasScore !== null && a.biasScore !== undefined) return a.biasScore < -15;
      const pub = this.publishers.get(a.sourceId);
      const r = (pub?.biasRating || "").toLowerCase();
      return r.includes("left") && !r.includes("lean");
    });
    const rightOnly = published.filter(a => {
      if (a.biasScore !== null && a.biasScore !== undefined) return a.biasScore > 15;
      const pub = this.publishers.get(a.sourceId);
      const r = (pub?.biasRating || "").toLowerCase();
      return r.includes("right") && !r.includes("lean");
    });

    // Sort by recency
    leftOnly.sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0));
    rightOnly.sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0));

    const leftBlindspot = await Promise.all(leftOnly.slice(0, 10).map(a => this.enrichArticle(a)));
    const rightBlindspot = await Promise.all(rightOnly.slice(0, 10).map(a => this.enrichArticle(a)));

    return { leftBlindspot, rightBlindspot };
  }

  async trackReadingHistory(userId: string, articleId: string): Promise<ReadingHistoryEntry> {
    const entry: ReadingHistoryEntry = {
      userId,
      articleId,
      readAt: new Date(),
    };
    this.readingHistoryStore.push(entry);
    return entry;
  }

  async getReadingHistory(userId: string, limit: number = 20): Promise<(ReadingHistoryEntry & { article: ArticleWithDetails })[]> {
    const userHistory = this.readingHistoryStore
      .filter(h => h.userId === userId)
      .sort((a, b) => b.readAt.getTime() - a.readAt.getTime())
      .slice(0, limit);

    const results: (ReadingHistoryEntry & { article: ArticleWithDetails })[] = [];
    for (const entry of userHistory) {
      const article = await this.getArticle(entry.articleId);
      if (article) {
        results.push({ ...entry, article });
      }
    }
    return results;
  }

  async getMyNewsBias(userId: string): Promise<MyBiasStats> {
    const userHistory = this.readingHistoryStore.filter(h => h.userId === userId);
    
    // Deduplicate by articleId (count each article once)
    const setIds = new Set(userHistory.map(h => h.articleId));
    const readArticleIds = Array.from(setIds);
    const totalRead = readArticleIds.length;
    
    let proEstablishmentCount = 0;
    let neutralCount = 0;
    let proOppositionCount = 0;
    const publisherCounts: Map<string, { name: string; count: number; bias: string | null }> = new Map();

    for (const articleId of readArticleIds) {
      const article = this.articles.get(articleId);
      if (!article) continue;

      const score = article.biasScore || 0;
      if (score < -0.3) proEstablishmentCount++;
      else if (score > 0.3) proOppositionCount++;
      else neutralCount++;

      const publisher = this.publishers.get(article.sourceId);
      if (publisher) {
        const existing = publisherCounts.get(publisher.id) || { name: publisher.name, count: 0, bias: publisher.biasRating };
        existing.count++;
        publisherCounts.set(publisher.id, existing);
      }
    }

    const topPublishers = Array.from(publisherCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Determine blindspot: the bias you read least
    let blindspotBias: string | null = null;
    if (totalRead > 0) {
      const min = Math.min(proEstablishmentCount, neutralCount, proOppositionCount);
      if (min === proEstablishmentCount) blindspotBias = "left";
      else if (min === proOppositionCount) blindspotBias = "right";
      else blindspotBias = "center";
    }

    const distribution7: Record<string, number> = {
      far_left: 0, left: 0, center_left: 0, center: 0, center_right: 0, right: 0, far_right: 0
    };
    // (In MemStorage we'd normally iterate to fill this, but for now we'll just return zeros or simple mapping)
    distribution7.left = proEstablishmentCount;
    distribution7.center = neutralCount;
    distribution7.right = proOppositionCount;

    return {
      totalRead,
      proEstablishmentCount,
      neutralCount,
      proOppositionCount,
      proEstablishmentPercent: totalRead > 0 ? Math.round((proEstablishmentCount / totalRead) * 100) : 0,
      neutralPercent: totalRead > 0 ? Math.round((neutralCount / totalRead) * 100) : 0,
      proOppositionPercent: totalRead > 0 ? Math.round((proOppositionCount / totalRead) * 100) : 0,
      regionalAlignedCount: 0,
      regionalAlignedPercent: 0,
      alarmingPercent: 0,
      hopefulPercent: 0,
      shannonDiversity: 0, // Simplified for MemStorage
      diversityLabel: "Moderate",
      topPublishers,
      blindspotBias,
      biasDistribution: distribution7,
    };
  }

  async getUserPreferences(userId: string): Promise<UserPreference | undefined> {
    return this.userPreferencesStore.get(userId);
  }

  async updateUserPreferences(userId: string, data: Partial<UserPreference>): Promise<UserPreference> {
    const existing = this.userPreferencesStore.get(userId) || {
      userId,
      followedTopics: [],
      followedCategories: [],
      preferredBias: [],
      updatedAt: new Date(),
    };
    const updated: UserPreference = {
      ...existing,
      ...data,
      userId,
      updatedAt: new Date(),
    };
    this.userPreferencesStore.set(userId, updated);
    return updated;
  }

  async trackShare(articleId: string, userId: string | null, platform: string): Promise<ShareEvent> {
    const event: ShareEvent = {
      id: randomUUID(),
      articleId,
      userId,
      platform,
      sharedAt: new Date(),
    };
    this.shareEventsStore.push(event);
    // Update share count index so enrichArticle is O(1) instead of O(n)
    this.shareCountByArticle.set(articleId, (this.shareCountByArticle.get(articleId) || 0) + 1);
    return event;
  }

  async getArticleShareCount(articleId: string): Promise<number> {
    return this.shareCountByArticle.get(articleId) || 0;
  }

  async getForYouArticles(userId: string, limit: number = 20): Promise<ArticleWithDetails[]> {
    const prefs = this.userPreferencesStore.get(userId);
    let published = Array.from(this.articles.values()).filter(a => a.status === "published");

    if (prefs) {
      // Score articles based on user preferences
      const scored = published.map(article => {
        let score = 0;
        
        // Category match
        if (prefs.followedCategories && prefs.followedCategories.length > 0) {
          const articleCats = this.articleCategories.get(article.id) || [];
          for (const catId of articleCats) {
            if (prefs.followedCategories.includes(catId)) score += 10;
          }
        }

        // Topic/tag match
        if (prefs.followedTopics && prefs.followedTopics.length > 0) {
          const articleTagIds = this.articleTags.get(article.id) || [];
          for (const tagId of articleTagIds) {
            const tag = this.tags.get(tagId);
            if (tag && prefs.followedTopics.includes(tag.slug)) score += 5;
          }
        }

        // Bias preference match
        if (prefs.preferredBias && prefs.preferredBias.length > 0) {
          const score_val = article.biasScore || 0;
          let currentBias = "center";
          if (score_val < -0.3) currentBias = "left";
          else if (score_val > 0.3) currentBias = "right";
          
          if (prefs.preferredBias.includes(currentBias)) score += 3;
        }

        // Recency bonus
        const age = Date.now() - (article.publishedAt || article.createdAt).getTime();
        const hoursOld = age / (1000 * 60 * 60);
        score += Math.max(0, 5 - hoursOld / 24);

        return { article, score };
      });

      scored.sort((a, b) => b.score - a.score);
      published = scored.map(s => s.article);
    } else {
      // No preferences: fall back to trending
      published.sort((a, b) => {
        const viewsA = (this.articleViews.get(a.id) || []).length;
        const viewsB = (this.articleViews.get(b.id) || []).length;
        return viewsB - viewsA;
      });
    }

    const top = published.slice(0, limit);
    return Promise.all(top.map(a => this.enrichArticle(a)));
  }

  async updateArticleContent(id: string, bodyHtml: string): Promise<void> {
    const article = this.articles.get(id);
    if (article) {
      this.articles.set(id, { ...article, bodyHtml, updatedAt: new Date() });
    }
  }

  async getSystemSettings(): Promise<SystemSettings> {
    return this.systemSettingsStore;
  }

  async updateSystemSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    this.systemSettingsStore = {
      ...this.systemSettingsStore,
      ...data,
      updatedAt: new Date()
    };
    return this.systemSettingsStore;
  }

  async resetFetchQueue(): Promise<void> {
    this.fetchQueueStore.clear();
    const activePublishers = Array.from(this.publishers.values()).filter(p => p.active);
    for (const p of activePublishers) {
      this.fetchQueueStore.set(p.id, {
        id: Math.random().toString(36).substring(2),
        publisherId: p.id,
        status: "pending",
        error: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  async findSimilarArticles(embedding: number[], options: { limit?: number; threshold?: number } = {}): Promise<Article[]> {
    const limit = options.limit || 5;
    const threshold = options.threshold || 0.22;
    const results: { article: Article, score: number }[] = [];
    
    for (const article of this.articles.values()) {
      if (!article.embedding) continue;
      // In MemStorage, embeddings are stored as number[]
      const score = calculateCosineSimilarity(embedding, article.embedding as any);
      if (score >= threshold) {
        results.push({ article, score });
      }
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.article);
  }

  async getHomepageSlots(): Promise<Record<string, any[]>> {
    // Simplified implementation for MemStorage — returns flattened clusters
    const data = await this.getHomepageClusters(50);
    return {
      breaking: data.slice(0, 4),
      top_stories: data.slice(4, 14),
      blindspots: [],
      category_highlights: [],
    };
  }
}

export class DatabaseStorage implements IStorage {
  private fetchQueueStore: Map<string, FetchQueue>;

  constructor() {
    this.fetchQueueStore = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser, insertProfile: InsertUserProfile): Promise<{ user: User; profile: UserProfile }> {
    return await db.transaction(async (tx: any) => {
      const [user] = await tx.insert(users).values(insertUser).returning();
      const [profile] = await tx.insert(userProfiles).values({
        ...insertProfile,
        userId: user.id
      }).returning();
      return { user, profile };
    });
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [updated] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return updated;
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const [updated] = await db.update(userProfiles).set({ ...data, updatedAt: new Date() }).where(eq(userProfiles.userId, userId)).returning();
    return updated;
  }

  async getPublisher(id: string): Promise<Publisher | undefined> {
    const [publisher] = await db.select().from(publishers).where(eq(publishers.id, id));
    return publisher;
  }

  async getPublisherBySlug(slug: string): Promise<Publisher | undefined> {
    const [publisher] = await db.select().from(publishers).where(eq(publishers.slug, slug));
    return publisher;
  }

  async listPublishers(): Promise<Publisher[]> {
    return await db.select().from(publishers).orderBy(publishers.name);
  }

  async createPublisher(publisher: InsertPublisher): Promise<Publisher> {
    const [newPublisher] = await db.insert(publishers).values(publisher).returning();
    return newPublisher;
  }

  async updatePublisher(id: string, data: Partial<Publisher>): Promise<Publisher> {
    const [updated] = await db.update(publishers).set({ ...data, updatedAt: new Date() }).where(eq(publishers.id, id)).returning();
    return updated;
  }

  async deletePublisher(id: string): Promise<void> {
    await db.delete(publishers).where(eq(publishers.id, id));
  }

  async getCluster(id: string): Promise<Cluster | undefined> {
    return await cache.fetch(CACHE_KEYS.CLUSTER_BY_ID(id), async () => {
      const [cluster] = await db.select().from(clusters).where(eq(clusters.id, id));
      return cluster;
    });
  }

  async listClusters(): Promise<Cluster[]> {
    return await db.select().from(clusters).orderBy(desc(clusters.lastUpdatedAt));
  }

  async createCluster(cluster: InsertCluster): Promise<Cluster> {
    const [newCluster] = await db.insert(clusters).values({
      ...cluster,
      id: cluster.id || randomUUID()
    }).returning();
    await cache.delete(CACHE_KEYS.ARTICLES_LATEST);
    return newCluster;
  }

  async updateCluster(id: string, data: Partial<Cluster>): Promise<Cluster> {
    const [updated] = await db.update(clusters).set(data).where(eq(clusters.id, id)).returning();
    await cache.delete(CACHE_KEYS.CLUSTER_BY_ID(id));
    await cache.delete(CACHE_KEYS.ARTICLES_LATEST);
    return updated;
  }

  async deleteCluster(id: string): Promise<void> {
    await db.delete(clusters).where(eq(clusters.id, id));
    await cache.delete(CACHE_KEYS.CLUSTER_BY_ID(id));
    await cache.delete(CACHE_KEYS.ARTICLES_LATEST);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
    return category;
  }

  async listCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const [updated] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getTag(id: string): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }

  async getTagBySlug(slug: string): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.slug, slug));
    return tag;
  }

  async listTags(): Promise<Tag[]> {
    return await db.select().from(tags).orderBy(tags.name);
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [newTag] = await db.insert(tags).values(tag).returning();
    return newTag;
  }

  async getArticle(id: string): Promise<ArticleWithDetails | undefined> {
    return await cache.fetch(CACHE_KEYS.ARTICLE_BY_ID(id), async () => {
      const [article] = await db.select().from(articles).where(eq(articles.id, id));
      if (!article) return undefined;
      return await this.enrichArticle(article);
    });
  }

  async getArticleBySlug(slug: string): Promise<ArticleWithDetails | undefined> {
    return await cache.fetch(CACHE_KEYS.ARTICLE_BY_SLUG(slug), async () => {
      const [article] = await db.select().from(articles).where(eq(articles.slug, slug));
      if (!article) return undefined;
      return await this.enrichArticle(article);
    });
  }

  // Related = different cluster, same category — single JOIN, no serial round-trips
  async getRelatedArticles(id: string): Promise<ArticleWithDetails[]> {
    // One query: subquery for this article's categories, JOIN to find cross-cluster matches
    const related = await db
      .selectDistinct({ 
        id: articles.id,
        importanceScore: articles.importanceScore,
        publishedAt: articles.publishedAt
      })
      .from(articles)
      .innerJoin(articleCategories, eq(articleCategories.articleId, articles.id))
      .where(and(
        inArray(
          articleCategories.categoryId,
          db.select({ categoryId: articleCategories.categoryId })
            .from(articleCategories)
            .where(eq(articleCategories.articleId, id))
        ),
        sql`${articles.id} != ${id}`,
        eq(articles.status, "published" as any),
        // Exclude same cluster (that's getSimilarArticles' job)
        sql`(${articles.clusterId} IS NULL OR ${articles.clusterId} != (
          SELECT cluster_id FROM articles WHERE id = ${id}
        ))`
      ))
      .orderBy(desc(articles.importanceScore), desc(articles.publishedAt))
      .limit(6);

    if (related.length === 0) return [];
    const ids = (related as any[]).map((r: any) => r.id);
    const full = await db.select().from(articles).where(inArray(articles.id, ids));
    return this.enrichArticlesBatch(full);
  }

  // Similar = same cluster (same event, different sources) — simple index lookup
  async getSimilarArticles(id: string): Promise<ArticleWithDetails[]> {
    const similar = await db
      .select()
      .from(articles)
      .where(and(
        eq(articles.clusterId,
          db.select({ clusterId: articles.clusterId })
            .from(articles)
            .where(eq(articles.id, id))
            .limit(1) as any
        ),
        sql`${articles.id} != ${id}`,
        eq(articles.status, "published" as any)
      ))
      .orderBy(desc(articles.publishedAt))
      .limit(10);
    return this.enrichArticlesBatch(similar);
  }

  async listArticles(params: {
    status?: string;
    sourceId?: string;
    categoryId?: string;
    bias?: string;
    search?: string;
    clusterId?: string;
    visibilityState?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ articles: ArticleWithDetails[]; total: number }> {
    if (!params.clusterId && !params.search && !params.sourceId && !params.categoryId && !params.bias && !params.status) {
      // Homepage cache
      return await cache.fetch(CACHE_KEYS.ARTICLES_LATEST, async () => {
        return await this.fetchLatestArticles(params);
      });
    }

    return await this.fetchLatestArticles(params);
  }

  private async fetchLatestArticles(params: any): Promise<{ articles: ArticleWithDetails[]; total: number }> {
    let conditions: any[] = [];
    if (params.sourceId) conditions.push(eq(articles.sourceId, params.sourceId));
    if (params.clusterId) conditions.push(eq(articles.clusterId, params.clusterId));
    
    // Status filter: default to 'published' for public-facing queries
    if (params.status) {
      conditions.push(eq(articles.status, params.status as any));
    } else if (!params.clusterId) {
      // When not fetching a specific cluster, default to published only
      conditions.push(eq(articles.status, 'published' as any));
    }

    // Include visible and low_priority — both have valid bias data
    if (params.visibilityState) {
      conditions.push(eq(articles.visibilityState, params.visibilityState));
    } else {
      conditions.push(
        sql`${articles.visibilityState} IN ('visible', 'low_priority')`
      );
    }


    if (params.search) {
      conditions.push(or(
        like(articles.title, `%${params.search}%`),
        like(articles.bodyClean, `%${params.search}%`)
      ));
    }

    // Bias filter using biasScore with publisher biasRating fallback
    if (params.bias && (params.bias === 'left' || params.bias === 'right' || params.bias === 'center')) {
      if (params.bias === 'left') {
        conditions.push(sql`(${articles.biasScore} < -15 OR (${articles.biasScore} IS NULL AND EXISTS(
          SELECT 1 FROM ${publishers} p WHERE p.id = ${articles.sourceId} AND LOWER(p.bias_rating::text) LIKE '%left%'
        )))`);
      } else if (params.bias === 'right') {
        conditions.push(sql`(${articles.biasScore} > 15 OR (${articles.biasScore} IS NULL AND EXISTS(
          SELECT 1 FROM ${publishers} p WHERE p.id = ${articles.sourceId} AND LOWER(p.bias_rating::text) LIKE '%right%'
        )))`);
      } else {
        conditions.push(sql`(${articles.biasScore} BETWEEN -15 AND 15 OR (${articles.biasScore} IS NULL AND NOT EXISTS(
          SELECT 1 FROM ${publishers} p WHERE p.id = ${articles.sourceId} AND (LOWER(p.bias_rating::text) LIKE '%left%' OR LOWER(p.bias_rating::text) LIKE '%right%')
        )))`);
      }
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    let query;
    if (params.categoryId) {
      const categoryArticles = db.select({ articleId: articleCategories.articleId })
        .from(articleCategories)
        .where(eq(articleCategories.categoryId, params.categoryId));
      
      query = db.select().from(articles).where(and(whereClause, sql`${articles.id} IN ${categoryArticles}`));
    } else {
      query = db.select().from(articles).where(whereClause);
    }

    if (!params.clusterId && !params.search) {
      // Pick the latest article for each clusterId
      const distinctQuery = sql`
        SELECT *
        FROM (
          SELECT *, ROW_NUMBER() OVER(PARTITION BY COALESCE(cluster_id, id) ORDER BY published_at DESC) as rn
          FROM ${articles}
          WHERE ${whereClause || sql`TRUE`}
          ${params.categoryId ? sql`AND id IN (SELECT article_id FROM ${articleCategories} WHERE category_id = ${params.categoryId})` : sql``}
        ) t
        WHERE rn = 1
        ORDER BY published_at DESC
        LIMIT ${params.limit || 20}
        OFFSET ${params.offset || 0}
      `;
      
      const rawResults = await db.execute(distinctQuery);
      const results = rawResults.rows as Article[];
      
      const countQuery = sql`
        SELECT COUNT(DISTINCT COALESCE(cluster_id, id)) as count
        FROM ${articles}
        WHERE ${whereClause || sql`TRUE`}
        ${params.categoryId ? sql`AND id IN (SELECT article_id FROM ${articleCategories} WHERE category_id = ${params.categoryId})` : sql``}
      `;
      const countRes = await db.execute(countQuery);
      const total = Number(countRes.rows[0].count);

      const enriched = await this.enrichArticlesBatch(results);
      return { articles: enriched, total };
    }

    if (params.clusterId) {
      // Implement Deep-Dive Architecture Bias Quota for Clusters
      const BIAS_MAX = {
        left: 8,
        center: 8,
        right: 8,
        other: 3
      };
      
      const rawResults = await db.execute(sql`
        WITH RankedArticles AS (
          SELECT ${articles}.*, 
            CASE
              WHEN ${articles.biasScore} < -15 THEN 'left'
              WHEN ${articles.biasScore} > 15 THEN 'right'
              WHEN ${articles.biasScore} BETWEEN -15 AND 15 THEN 'center'
              ELSE COALESCE(
                 (SELECT CASE 
                    WHEN LOWER(${publishers.biasRating}::text) LIKE '%left%' THEN 'left'
                    WHEN LOWER(${publishers.biasRating}::text) LIKE '%right%' THEN 'right'
                    ELSE 'center'
                  END FROM ${publishers} WHERE id = ${articles.sourceId}),
                 'other'
              )
            END as derived_bias,
            ROW_NUMBER() OVER(
              PARTITION BY 
                CASE
                  WHEN ${articles.biasScore} < -15 THEN 'left'
                  WHEN ${articles.biasScore} > 15 THEN 'right'
                  WHEN ${articles.biasScore} BETWEEN -15 AND 15 THEN 'center'
                  ELSE COALESCE((SELECT CASE WHEN LOWER(${publishers.biasRating}::text) LIKE '%left%' THEN 'left' WHEN LOWER(${publishers.biasRating}::text) LIKE '%right%' THEN 'right' ELSE 'center' END FROM ${publishers} WHERE id = ${articles.sourceId}), 'other')
                END
              ORDER BY ${articles.importanceScore} DESC, ${articles.publishedAt} DESC
            ) as bias_rank
          FROM ${articles}
          WHERE ${whereClause || sql`TRUE`}
        )
        SELECT * FROM RankedArticles
        WHERE 
          (derived_bias = 'left' AND bias_rank <= ${BIAS_MAX.left}) OR
          (derived_bias = 'center' AND bias_rank <= ${BIAS_MAX.center}) OR
          (derived_bias = 'right' AND bias_rank <= ${BIAS_MAX.right}) OR
          (derived_bias = 'other' AND bias_rank <= ${BIAS_MAX.other})
        ORDER BY importance_score DESC, published_at DESC
        LIMIT ${params.limit || 20}
      `);
      
      const results = rawResults.rows as Article[];
      const enriched = await this.enrichArticlesBatch(results);
      return { articles: enriched, total: results.length };
    }

    const [countRes] = await db.select({ count: sql<number>`count(*)` }).from(articles).where(whereClause);
    const total = Number(countRes.count);

    const results = await query
      .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
      .limit(params.limit || 20)
      .offset(params.offset || 0);

    const enriched = await this.enrichArticlesBatch(results);
    return { articles: enriched, total };
  }

  async listAllArticlesRaw(limit: number = 5000): Promise<ArticleWithDetails[]> {
    const results = await db.select().from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(limit);
    
    return this.enrichArticlesBatch(results);
  }

  async createArticle(insertArticle: InsertArticle, categoryIds: string[], tagIds: string[]): Promise<Article> {
    const [article] = await db.insert(articles).values({
      ...insertArticle,
      id: insertArticle.id || randomUUID()
    })
    .onConflictDoNothing()
    .returning();
    
    if (!article) throw Object.assign(new Error("duplicate"), { code: '23505' });
    
    if (categoryIds.length > 0) {
      await db.insert(articleCategories).values(categoryIds.map(cid => ({ articleId: article.id, categoryId: cid })));
    }
    if (tagIds.length > 0) {
      await db.insert(articleTags).values(tagIds.map(tid => ({ articleId: article.id, tagId: tid })));
    }
    
    await cache.delete(CACHE_KEYS.ARTICLES_LATEST);
    return article;
  }

  async updateArticle(id: string, data: Partial<Article>, categoryIds?: string[], tagIds?: string[]): Promise<Article> {
    const [updated] = await db.update(articles).set({ ...data, updatedAt: new Date() }).where(eq(articles.id, id)).returning();
    
    if (categoryIds) {
      await db.delete(articleCategories).where(eq(articleCategories.articleId, id));
      if (categoryIds.length > 0) {
        await db.insert(articleCategories).values(categoryIds.map(cid => ({ articleId: id, categoryId: cid })));
      }
    }
    if (tagIds) {
      await db.delete(articleTags).where(eq(articleTags.articleId, id));
      if (tagIds.length > 0) {
        await db.insert(articleTags).values(tagIds.map(tid => ({ articleId: id, tagId: tid })));
      }
    }
    
    await cache.delete(CACHE_KEYS.ARTICLE_BY_ID(id));
    if (updated.slug) await cache.delete(CACHE_KEYS.ARTICLE_BY_SLUG(updated.slug));
    await cache.delete(CACHE_KEYS.ARTICLES_LATEST);
    return updated;
  }

  async deleteArticle(id: string): Promise<void> {
    const article = await this.getArticle(id);
    await db.delete(articles).where(eq(articles.id, id));
    await cache.delete(CACHE_KEYS.ARTICLE_BY_ID(id));
    if (article?.slug) await cache.delete(CACHE_KEYS.ARTICLE_BY_SLUG(article.slug));
    await cache.delete(CACHE_KEYS.ARTICLES_LATEST);
  }

  async publishArticle(id: string): Promise<Article> {
    const [published] = await db.update(articles).set({ status: "published", publishedAt: new Date(), updatedAt: new Date() }).where(eq(articles.id, id)).returning();
    await cache.delete(CACHE_KEYS.ARTICLE_BY_ID(id));
    if (published.slug) await cache.delete(CACHE_KEYS.ARTICLE_BY_SLUG(published.slug));
    await cache.delete(CACHE_KEYS.ARTICLES_LATEST);
    return published;
  }

  async trackArticleView(insertView: InsertArticleView): Promise<ArticleView> {
    const [view] = await db.insert(articleViews).values({
      ...insertView,
      id: randomUUID()
    }).returning();
    return view;
  }

  async getArticleViews(articleId: string): Promise<number> {
    const [res] = await db.select({ count: sql<number>`count(*)` }).from(articleViews).where(eq(articleViews.articleId, articleId));
    return Number(res.count);
  }

  async isBookmarked(userId: string, articleId: string): Promise<boolean> {
    const [bookmark] = await db.select().from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.articleId, articleId)));
    return !!bookmark;
  }

  async addBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    const [bookmark] = await db.insert(bookmarks).values(insertBookmark).returning();
    return bookmark;
  }

  async removeBookmark(userId: string, articleId: string): Promise<void> {
    await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.articleId, articleId)));
  }

  async getUserBookmarks(userId: string): Promise<ArticleWithDetails[]> {
    const results = await db.select({ article: articles })
      .from(bookmarks)
      .innerJoin(articles, eq(bookmarks.articleId, articles.id))
      .where(eq(bookmarks.userId, userId));
    
    return this.enrichArticlesBatch(results.map((r: any) => r.article));
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db.insert(sessions).values({
      ...insertSession,
      id: randomUUID()
    }).returning();
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session;
  }

  async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async updateArticleContent(id: string, bodyHtml: string): Promise<void> {
    await db.update(articles)
      .set({ bodyHtml, updatedAt: new Date() })
      .where(eq(articles.id, id));
  }

  async getTrendingArticles(limit: number): Promise<ArticleWithDetails[]> {
    const trending = await db.execute(sql`
      SELECT a.*, 
             COUNT(av.id) as view_count,
             GREATEST(0.1, 1.0 - EXTRACT(EPOCH FROM (NOW() - COALESCE(a.published_at, a.created_at))) / 259200.0) as recency_factor
      FROM ${articles} a
      LEFT JOIN ${articleViews} av ON a.id = av.article_id
      WHERE a.visibility_state = 'visible'
      GROUP BY a.id
      ORDER BY ((COUNT(av.id) + 1) * GREATEST(0.1, 1.0 - EXTRACT(EPOCH FROM (NOW() - COALESCE(a.published_at, a.created_at))) / 259200.0) + COALESCE(a.importance_score, 0) * 0.1) DESC
      LIMIT ${limit}
    `);

    const results = trending.rows.map((row: any) => {
      const art: any = { ...row };
      art.sourceId = row.source_id;
      art.clusterId = row.cluster_id;
      art.publishedAt = row.published_at ? new Date(row.published_at) : new Date();
      art.heroImageUrl = row.hero_image_url;
      art.sourceUrl = row.source_url;
      art.bodyClean = row.body_clean;
      art.bodyHtml = row.body_html;
      art.qualityScore = row.quality_score;
      art.importanceScore = row.importance_score;
      art.biasScore = row.bias_score;
      return art;
    });

    return this.enrichArticlesBatch(results);
  }

  async getHomepageClusters(limit: number = 50): Promise<any[]> {
    return await cache.fetch("homepage_clusters_final", async () => {
      const topClusters = await db.select()
        .from(clusters)
        .where(sql`${clusters.sourceCount} >= 1`)
        .orderBy(desc(clusters.importanceScore), desc(clusters.sourceCount), desc(clusters.lastUpdatedAt))
        .limit(200);

      if (topClusters.length === 0) return [];

      const clusterIds = topClusters.map((c: typeof topClusters[0]) => c.id);

      // Get the latest article for each cluster in a way that works with Postgres
      const latestArticlesQuery = sql`
        SELECT *
        FROM (
          SELECT *, ROW_NUMBER() OVER(PARTITION BY cluster_id ORDER BY published_at DESC) as rn
          FROM ${articles}
          WHERE cluster_id IN (${sql.join(clusterIds.map((id: string) => sql`${id}`), sql`, `)})
          AND visibility_state = 'visible'
        ) t
        WHERE rn = 1
      `;
      const rawResults = await db.execute(latestArticlesQuery);
      const repArticles = rawResults.rows.map((row: any) => {
        // Drizzle expects camelCase properties, but raw SQL returns snake_case
        const art: any = { ...row };
        if (row.cluster_id) art.clusterId = row.cluster_id;
        if (row.source_id) art.sourceId = row.source_id;
        if (row.published_at) art.publishedAt = row.published_at instanceof Date ? row.published_at : new Date(row.published_at);
        if (row.hero_image_url) art.heroImageUrl = row.hero_image_url;
        return art;
      });

      const enriched = await this.enrichArticlesBatch(repArticles, { skipSourceCount: true });
      const enrichedMap = new Map(enriched.map(a => [a.clusterId, a]));
      
      const results = [];
      for (const c of topClusters) {
        const art = enrichedMap.get(c.id);
        if (art) {
          results.push({
            ...art,
            isCluster: true,
            clusterId: c.id,
            sourceCount: c.sourceCount,
            headline: c.headline || art.title,
            clusterSummary: c.summary,
            proEstablishmentCount: c.proEstablishmentCount || 0,
            neutralCount: c.neutralCount || 0,
            proOppositionCount: c.proOppositionCount || 0,
            totalSources: c.sourceCount,
          });
        }
      }
      
      return results;
    });
  }

  async getBlindspotArticles(): Promise<{ leftBlindspot: ArticleWithDetails[]; rightBlindspot: ArticleWithDetails[] }> {
    const leftQuery = await db.execute(sql`
      SELECT a.* FROM ${articles} a
      INNER JOIN ${publishers} p ON a.source_id = p.id
      WHERE a.status = 'published'
        AND LOWER(p.bias_rating::text) LIKE '%left%'
      ORDER BY a.published_at DESC LIMIT 10
    `);

    const rightQuery = await db.execute(sql`
      SELECT a.* FROM ${articles} a
      INNER JOIN ${publishers} p ON a.source_id = p.id
      WHERE a.status = 'published'
        AND LOWER(p.bias_rating::text) LIKE '%right%'
      ORDER BY a.published_at DESC LIMIT 10
    `);

    const mapRow = (row: any) => {
      const art: any = { ...row };
      art.sourceId = row.source_id;
      art.clusterId = row.cluster_id;
      art.publishedAt = row.published_at ? new Date(row.published_at) : new Date();
      art.heroImageUrl = row.hero_image_url;
      art.sourceUrl = row.source_url;
      art.bodyClean = row.body_clean;
      art.bodyHtml = row.body_html;
      art.qualityScore = row.quality_score;
      art.importanceScore = row.importance_score;
      art.biasScore = row.bias_score;
      return art;
    };

    const leftBlindspot = await this.enrichArticlesBatch(leftQuery.rows.map(mapRow));
    const rightBlindspot = await this.enrichArticlesBatch(rightQuery.rows.map(mapRow));
    return { leftBlindspot, rightBlindspot };
  }

  async trackReadingHistory(userId: string, articleId: string): Promise<ReadingHistoryEntry> {
    const [entry] = await db.insert(readingHistory).values({ userId, articleId }).returning();
    return entry;
  }

  async getReadingHistory(userId: string, limit: number): Promise<(ReadingHistoryEntry & { article: ArticleWithDetails })[]> {
    const results = await db.select({ history: readingHistory, article: articles })
      .from(readingHistory)
      .innerJoin(articles, eq(readingHistory.articleId, articles.id))
      .where(eq(readingHistory.userId, userId))
      .orderBy(desc(readingHistory.readAt))
      .limit(limit);
    
    const enrichedArticles = await this.enrichArticlesBatch(results.map((r: any) => r.article));
    
    return results.map((r: any, i: number) => ({
      ...r.history,
      article: enrichedArticles[i]
    }));
  }

  async getMyNewsBias(userId: string): Promise<MyBiasStats> {
    const history = await db.select({ 
      biasScore: articles.biasScore,
      sourceId: articles.sourceId,
      sourceName: publishers.name,
      biasRating: sql<string | null>`${publishers.biasRating}`,
    })
      .from(readingHistory)
      .innerJoin(articles, eq(readingHistory.articleId, articles.id))
      .innerJoin(publishers, eq(articles.sourceId, publishers.id))
      .where(eq(readingHistory.userId, userId));
    
    const totalRead = history.length;
    let proEstablishmentCount = 0, neutralCount = 0, proOppositionCount = 0;
    const publisherCounts = new Map<string, { name: string; count: number; bias: string | null }>();

    for (const row of history) {
      // Determine bias: prefer numeric biasScore, fall back to biasRating string
      let bias = "center";
      if (row.biasScore !== null && row.biasScore !== undefined) {
        const s = Number(row.biasScore);
        bias = s < -15 ? "left" : s > 15 ? "right" : "center";
      } else if (row.biasRating) {
        const r = row.biasRating.toLowerCase();
        bias = r.includes("left") ? "left" : r.includes("right") ? "right" : "center";
      }
      if (bias === "left") proEstablishmentCount++;
      else if (bias === "right") proOppositionCount++;
      else neutralCount++;

      const existing = publisherCounts.get(row.sourceId) || { name: row.sourceName, count: 0, bias: row.biasRating };
      existing.count++;
      publisherCounts.set(row.sourceId, existing);
    }

    const topPublishers = Array.from(publisherCounts.values())
      .sort((a, b) => b.count - a.count).slice(0, 5);

    let blindspotBias: string | null = null;
    if (totalRead > 0) {
      const min = Math.min(proEstablishmentCount, neutralCount, proOppositionCount);
      blindspotBias = min === proEstablishmentCount ? "left" : min === neutralCount ? "center" : "right";
    }

    // --- Editorial Intelligence 2.0: Shannon Diversity Index ---
    const calculateSDI = (l: number, c: number, r: number) => {
      const total = l + c + r;
      if (total === 0) return 0;
      let sdi = 0;
      [l, c, r].forEach(count => {
        if (count > 0) {
          const p = count / total;
          sdi -= p * Math.log(p);
        }
      });
      return Math.min(Math.round((sdi / Math.log(3)) * 100), 100);
    };

    const shannonDiversity = calculateSDI(proEstablishmentCount, neutralCount, proOppositionCount);
    let diversityLabel = "Echo Chamber";
    if (shannonDiversity > 80) diversityLabel = "Exceptional";
    else if (shannonDiversity > 60) diversityLabel = "Balanced";
    else if (shannonDiversity > 40) diversityLabel = "Moderate";

    // 7-Point Distribution (using simplified counts for now, can be expanded if needed)
    const biasDistribution: Record<string, number> = {
      "left": proEstablishmentCount,
      "center": neutralCount,
      "right": proOppositionCount
    };

    return {
      totalRead,
      proEstablishmentCount,
      neutralCount,
      proOppositionCount,
      proEstablishmentPercent: totalRead > 0 ? Math.round((proEstablishmentCount / totalRead) * 100) : 0,
      neutralPercent: totalRead > 0 ? Math.round((neutralCount / totalRead) * 100) : 0,
      proOppositionPercent: totalRead > 0 ? Math.round((proOppositionCount / totalRead) * 100) : 0,
      regionalAlignedCount: 0,
      regionalAlignedPercent: 0,
      alarmingPercent: 0,
      hopefulPercent: 0,
      shannonDiversity,
      diversityLabel,
      topPublishers,
      blindspotBias,
      biasDistribution,
    };
  }

  async getUserPreferences(userId: string): Promise<UserPreference | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async updateUserPreferences(userId: string, data: Partial<UserPreference>): Promise<UserPreference> {
    const [updated] = await db.insert(userPreferences)
      .values({ ...data, userId })
      .onConflictDoUpdate({ target: userPreferences.userId, set: { ...data, updatedAt: new Date() } })
      .returning();
    return updated;
  }

  async trackShare(articleId: string, userId: string | null, platform: string): Promise<ShareEvent> {
    const [event] = await db.insert(shareEvents).values({ articleId, userId, platform }).returning();
    return event;
  }

  async getArticleShareCount(articleId: string): Promise<number> {
    const [res] = await db.select({ count: sql<number>`count(*)` }).from(shareEvents).where(eq(shareEvents.articleId, articleId));
    return Number(res.count);
  }

  async getForYouArticles(userId: string, limit: number): Promise<ArticleWithDetails[]> {
    const prefs = await this.getUserPreferences(userId);
    const biasStats = await this.getMyNewsBias(userId);
    let query = db.select().from(articles).where(eq(articles.status, 'published'));

    if (prefs) {
      if (prefs.followedCategories && prefs.followedCategories.length > 0) {
        const catIds = prefs.followedCategories;
        query = db.select().from(articles)
          .innerJoin(articleCategories, eq(articles.id, articleCategories.articleId))
          .where(and(
            eq(articles.status, 'published'),
            inArray(articleCategories.categoryId, catIds)
          )) as any;
      }
    }

    const articlesList = await query
      .orderBy(desc(articles.publishedAt))
      .limit(limit);
      
    const rawArticles = 'article' in articlesList[0] ? (articlesList as any[]).map(r => r.article) : articlesList;
    const enriched = await this.enrichArticlesBatch(rawArticles as Article[]);

    // FEED DIVERSITY INJECTION
    if (biasStats && biasStats.totalRead > 5) {
      let blindspotBias: "pro_establishment" | "pro_opposition" | "regional_aligned" | "neutral" | null = null;
      if (biasStats.proEstablishmentPercent > 60) blindspotBias = "pro_opposition";
      else if (biasStats.proOppositionPercent > 60) blindspotBias = "pro_establishment";

      if (blindspotBias) {
        // Fetch 2 recent, high-importance articles from the blindspot bucket
        const diversityRows = await db.select({ article: articles })
          .from(articles)
          .innerJoin(publishers, eq(articles.sourceId, publishers.id))
          .where(and(
            eq(articles.status, 'published'),
            eq(publishers.biasRating, blindspotBias as any)
          ))
          .orderBy(desc(articles.importanceScore), desc(articles.publishedAt))
          .limit(2);
          
        for (const row of diversityRows) {
          if (!enriched.some(a => a.id === row.article.id)) {
            const [enrichedDiv] = await this.enrichArticlesBatch([row.article]);
            (enrichedDiv as any).isDiversityPick = true;
            // Insert randomly in the top 5
            const insertIndex = Math.floor(Math.random() * Math.min(5, enriched.length));
            enriched.splice(insertIndex, 0, enrichedDiv);
            if (enriched.length > limit) enriched.pop();
          }
        }
      }
    }
    
    return enriched;
  }

  async getSystemSettings(): Promise<SystemSettings> {
    const [settings] = await db.select().from(systemSettings).where(eq(systemSettings.id, 'global'));
    return settings || { id: 'global', fetchCountry: 'US', fetchLanguage: 'en', localNewsKeywords: '', activeTopics: [], useBrowserLocation: false, updatedAt: new Date() };
  }

  async updateSystemSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    const [updated] = await db.insert(systemSettings)
      .values({ ...data, id: 'global' })
      .onConflictDoUpdate({ target: systemSettings.id, set: { ...data, updatedAt: new Date() } })
      .returning();
    return updated;
  }

  async resetFetchQueue(): Promise<void> {
    this.fetchQueueStore.clear();
    const activePublishers = await this.listPublishers();
    for (const p of activePublishers) {
      if (p.active) {
        this.fetchQueueStore.set(p.id, {
          id: randomUUID(),
          publisherId: p.id,
          status: "pending",
          error: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as FetchQueue);
      }
    }
  }

  private async enrichArticlesBatch(articleList: Article[], options: { skipSourceCount?: boolean } = {}): Promise<ArticleWithDetails[]> {
    if (articleList.length === 0) return [];

    const articleIds = articleList.map(a => a.id);
    const sourceIds = articleList.map(a => a.sourceId).filter((val, index, self) => self.indexOf(val) === index);
    const clusterIds = articleList.map(a => a.clusterId).filter(Boolean).filter((val, index, self) => self.indexOf(val) === index) as string[];

    const pubs = await db.select().from(publishers).where(inArray(publishers.id, sourceIds));
    const pubMap = new Map<string, typeof pubs[0]>(pubs.map((p: any) => [p.id, p]));

    const allCats = await db.select({ articleId: articleCategories.articleId, category: categories })
      .from(articleCategories)
      .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
      .where(inArray(articleCategories.articleId, articleIds));
    
    const catMap = new Map<string, Category[]>();
    allCats.forEach((c: any) => {
      const existing = catMap.get(c.articleId) || [];
      existing.push(c.category);
      catMap.set(c.articleId, existing);
    });

    const allTags = await db.select({ articleId: articleTags.articleId, tag: tags })
      .from(articleTags)
      .innerJoin(tags, eq(articleTags.tagId, tags.id))
      .where(inArray(articleTags.articleId, articleIds));

    const tagMap = new Map<string, Tag[]>();
    allTags.forEach((t: any) => {
      const existing = tagMap.get(t.articleId) || [];
      existing.push(t.tag);
      tagMap.set(t.articleId, existing);
    });

    const sourceCountMap = new Map<string, number>();
    if (!options.skipSourceCount && clusterIds.length > 0) {
      const counts = await db.select({ clusterId: articles.clusterId, count: sql<number>`count(distinct ${articles.sourceId})` })
        .from(articles)
        .where(inArray(articles.clusterId, clusterIds))
        .groupBy(articles.clusterId);
      
      counts.forEach((c: any) => {
        if (c.clusterId) sourceCountMap.set(c.clusterId, Number(c.count));
      });
    }
    
    return articleList.map(article => {
      const pub = pubMap.get(article.sourceId);
      
      // --- Editorial Intelligence 2.0: 7-Point and 3-Point Bias Derivation ---
      const score = Number(article.biasScore ?? 0);
      const pubRating = (pub?.biasRating || "").toLowerCase();
      
      // Simplified Bias Derivation
      let biasLabel: Bias = "neutral";
      if (score < -15 || pubRating.includes("pro_establishment")) biasLabel = "pro_establishment";
      else if (score > 15 || pubRating.includes("pro_opposition")) biasLabel = "pro_opposition";
      else if (pubRating.includes("regional_aligned")) biasLabel = "regional_aligned";

      return {
        ...article,
        publisher: pub!,
        categories: catMap.get(article.id) || [],
        tags: tagMap.get(article.id) || [],
        bias: biasLabel, // Keep legacy field for compatibility
        biasLabel,
        sourceCount: article.clusterId ? (sourceCountMap.get(article.clusterId) || 1) : 1
      } as ArticleWithDetails;
    });
  }

  private async enrichArticle(article: Article): Promise<ArticleWithDetails> {
    const results = await this.enrichArticlesBatch([article]);
    return results[0];
  }

  async findSimilarArticles(embedding: number[], options: { limit?: number; threshold?: number } = {}): Promise<Article[]> {
    const limit = options.limit || 5;
    const thresh = options.threshold || 0.22;
    try {
      // Use pgvector cosine distance operator if available
      const results = await db.execute(sql`
        SELECT a.* FROM ${articles} a
        INNER JOIN article_embeddings ae ON a.id = ae.article_id
        WHERE 1 - (ae.embedding <=> ${`[${embedding.join(',')}]`}::vector) > ${thresh}
        ORDER BY ae.embedding <=> ${`[${embedding.join(',')}]`}::vector ASC
        LIMIT ${limit}
      `);
      return results.rows as Article[];
    } catch (_err) {
      // Fallback: return empty if pgvector extension not available
      console.warn("[Storage] findSimilarArticles: pgvector query failed, returning empty.");
      return [];
    }
  }

  async getHomepageSlots(): Promise<Record<string, any[]>> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. BREAKING (Master Score > 80, < 4h old) - BIG SOURCE BUFFER: ignore quality gate if sourceCount > 10
    const breaking = await db.select()
      .from(clusters)
      .where(and(
        or(gte(clusters.importanceScore, 80), gte(clusters.sourceCount, 10)),
        gte(clusters.firstSeenAt, new Date(Date.now() - 4 * 60 * 60 * 1000))
      ))
      .orderBy(desc(clusters.importanceScore))
      .limit(4);

    // 2. TOP STORIES (Master Score > 50, Diversity Guard)
    const topStories = await db.select()
      .from(clusters)
      .where(and(
        gte(clusters.importanceScore, 50),
        gte(clusters.firstSeenAt, twentyFourHoursAgo)
      ))
      .orderBy(desc(clusters.importanceScore))
      .limit(10);

    // 3. BLINDSPOTS (BlindspotScore > 50)
    const blindspots = await db.select()
      .from(clusters)
      .where(and(
        gte(clusters.blindspotScore, 50),
        gte(clusters.firstSeenAt, twentyFourHoursAgo)
      ))
      .orderBy(desc(clusters.blindspotScore))
      .limit(5);

    // 4. CATEGORY HIGHLIGHTS (Diversity Guard Quotas)
    const quotas: Record<string, number> = {
      "politics": 4, "world": 3, "technology": 2, "business": 2, "health": 1, "science": 1, "sports": 1
    };
    const categoryHighlights: any[] = [];
    
    for (const [slug, count] of Object.entries(quotas)) {
      const topOfCategory = await db.select()
        .from(clusters)
        .where(and(
          eq(clusters.categorySlug, slug),
          gte(clusters.lastUpdatedAt, twentyFourHoursAgo)
        ))
        .orderBy(desc(clusters.importanceScore))
        .limit(count);
      categoryHighlights.push(...topOfCategory);
    }

    // Enrich all results
    const processing = await import("./processing");
    const enrichBatch = async (items: any[]) => {
      const ids = items.map(i => i.id);
      if (ids.length === 0) return [];
      const artList = await db.select().from(articles)
        .where(and(eq(articles.status, "published"), inArray(articles.clusterId, ids)))
        .orderBy(desc(articles.publishedAt));
      
      const enriched = await this.enrichArticlesBatch(artList, { skipSourceCount: true });
      
      return items.map(c => {
        const clusterArticles = enriched.filter(a => a.clusterId === c.id);
        const { articles: sorted, shannonDiversity } = processing.fillCluster(clusterArticles);
        const divergence = processing.calculateNarrativeDivergence(clusterArticles);
        return { ...c, articles: sorted, shannonDiversity, divergenceScore: divergence };
      });
    };

    return {
      breaking: await enrichBatch(breaking),
      top_stories: await enrichBatch(topStories),
      blindspots: await enrichBatch(blindspots),
      category_highlights: await enrichBatch(categoryHighlights),
    };
  }

  async getTrendingTopics(hours: number = 6): Promise<any[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentClusters = await db.select({
      headline: clusters.headline,
      id: clusters.id
    })
    .from(clusters)
    .where(gte(clusters.lastUpdatedAt, cutoff));

    const keywordCounts = new Map<string, { count: number, clusters: Set<string> }>();
    
    // Simple tokenizer for trending keywords
    const getTokens = (text: string) => text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 4 && !["after", "before", "while", "report", "breaking", "update"].includes(w));

    for (const c of recentClusters) {
      const tokens = getTokens(c.headline);
      for (const t of tokens) {
        const stats = keywordCounts.get(t) || { count: 0, clusters: new Set() };
        stats.count++;
        stats.clusters.add(c.id);
        keywordCounts.set(t, stats);
      }
    }

    return Array.from(keywordCounts.entries())
      .map(([word, stats]) => ({
        topic: word,
        score: stats.clusters.size * 10 + stats.count,
        clusterCount: stats.clusters.size
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
}

let _realStorage: IStorage | null = null;
let _memStorage: IStorage | null = null;

export const storage = new Proxy({} as any, {
  get: (_, prop) => {
    // Determine which storage to use
    let targetStorage: IStorage;
    if (process.env.DATABASE_URL) {
      if (!_realStorage) _realStorage = new DatabaseStorage();
      targetStorage = _realStorage;
    } else {
      if (!_memStorage) _memStorage = new MemStorage();
      targetStorage = _memStorage;
    }

    const value = (targetStorage as any)[prop];
    if (typeof value === "function") {
      return value.bind(targetStorage);
    }
    return value;
  }
});
