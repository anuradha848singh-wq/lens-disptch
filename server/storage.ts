import { 
  type User, type InsertUser, type UserProfile, type InsertUserProfile,
  type Publisher, type InsertPublisher,
  type Category, type InsertCategory,
  type Tag, type InsertTag,
  type Article, type InsertArticle, type ArticleWithDetails,
  type ArticleView, type InsertArticleView,
  type Bookmark, type InsertBookmark,
  type Session, type InsertSession,
  type ArticleStatus, type Bias,
  type ReadingHistoryEntry, type UserPreference, type ShareEvent, type MyBiasStats,
  type SystemSettings, type InsertSystemSettings,
  users, userProfiles, publishers, categories, tags, 
  articles, articleCategories, articleTags, articleViews, 
  bookmarks, sessions, fetchQueue, readingHistory, 
  userPreferences, shareEvents, systemSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

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
  listArticles(params: {
    status?: ArticleStatus;
    authorId?: string;
    publisherId?: string;
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private userProfiles: Map<string, UserProfile>;
  private publishers: Map<string, Publisher>;
  private categories: Map<string, Category>;
  private tags: Map<string, Tag>;
  private articles: Map<string, Article>;
  private articleCategories: Map<string, string[]>;
  private articleTags: Map<string, string[]>;
  private articleViews: Map<string, ArticleView[]>;
  private sessions: Map<string, Session>;
  private fetchQueueStore: Map<string, any>;
  // Ground News features
  private readingHistoryStore: ReadingHistoryEntry[];
  private userPreferencesStore: Map<string, UserPreference>;
  private shareEventsStore: ShareEvent[];
  private systemSettingsStore: SystemSettings;

  constructor() {
    this.users = new Map();
    this.userProfiles = new Map();
    this.publishers = new Map();
    this.categories = new Map();
    this.tags = new Map();
    this.articles = new Map();
    this.articleCategories = new Map();
    this.articleTags = new Map();
    this.articleViews = new Map();
    this.bookmarks = new Map();
    this.sessions = new Map();
    this.fetchQueueStore = new Map();
    this.readingHistoryStore = [];
    this.userPreferencesStore = new Map();
    this.shareEventsStore = [];
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
      const id = randomUUID();
      this.categories.set(id, {
        id,
        ...cat,
        description: null,
        createdAt: new Date(),
      });
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async createUser(insertUser: InsertUser, insertProfile: InsertUserProfile): Promise<{ user: User; profile: UserProfile }> {
    const id = randomUUID();
    const user: User = {
      id,
      email: insertUser.email,
      passwordHash: insertUser.passwordHash,
      role: insertUser.role || "editor",
      status: insertUser.status || "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);

    const profile: UserProfile = {
      userId: id,
      displayName: insertProfile.displayName,
      avatarUrl: insertProfile.avatarUrl || null,
      bio: insertProfile.bio || null,
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
    return Array.from(this.publishers.values()).find(p => p.slug === slug);
  }

  async listPublishers(): Promise<Publisher[]> {
    return Array.from(this.publishers.values());
  }

  async createPublisher(insertPublisher: InsertPublisher): Promise<Publisher> {
    const id = Math.random().toString(36).substring(2);
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
      ownerType: insertPublisher.ownerType || null,
      country: insertPublisher.country || "US",
      language: insertPublisher.language || "en",
      active: true,
      failCount: 0,
      lastFetchedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.publishers.set(id, publisher);
    return publisher;
  }

  async updatePublisher(id: string, data: Partial<Publisher>): Promise<Publisher> {
    const publisher = this.publishers.get(id);
    if (!publisher) throw new Error("Publisher not found");
    const updated = { ...publisher, ...data, updatedAt: new Date() };
    this.publishers.set(id, updated);
    return updated;
  }

  async deletePublisher(id: string): Promise<void> {
    this.publishers.delete(id);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    return Array.from(this.categories.values()).find(c => c.slug === slug);
  }

  async listCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
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
    return Array.from(this.tags.values()).find(t => t.slug === slug);
  }

  async listTags(): Promise<Tag[]> {
    return Array.from(this.tags.values());
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const id = randomUUID();
    const tag: Tag = {
      id,
      ...insertTag,
      createdAt: new Date(),
    };
    this.tags.set(id, tag);
    return tag;
  }

  private async enrichArticle(article: Article): Promise<ArticleWithDetails> {
    const publisher = await this.getPublisher(article.publisherId);
    const authorProfile = await this.getUserProfile(article.authorId);
    const categoryIds = this.articleCategories.get(article.id) || [];
    const tagIds = this.articleTags.get(article.id) || [];
    const views = this.articleViews.get(article.id) || [];
    const shareCount = this.shareEventsStore.filter(s => s.articleId === article.id).length;

    // Count how many publishers cover a similar topic 
    // Use actual clusterId if available, fallback to old category method
    let sourceCount = 1;
    const allArticles = Array.from(this.articles.values());
    const relatedSourceIds = new Set<string>();
    relatedSourceIds.add(article.publisherId);
    
    if (article.clusterId) {
      for (const other of allArticles) {
        if (other.id !== article.id && other.clusterId === article.clusterId && other.status === "published") {
          relatedSourceIds.add(other.publisherId);
        }
      }
      sourceCount = relatedSourceIds.size;
    } else {
      const articleCats = new Set(categoryIds);
      if (articleCats.size > 0) {
        for (const other of allArticles) {
          if (other.id === article.id) continue;
          const otherCats = this.articleCategories.get(other.id) || [];
          const hasOverlap = otherCats.some(c => articleCats.has(c));
          if (hasOverlap && other.status === "published") {
            relatedSourceIds.add(other.publisherId);
          }
        }
      }
      sourceCount = relatedSourceIds.size;
    }

    return {
      ...article,
      publisher: publisher!,
      author: authorProfile!,
      categories: categoryIds.map(id => this.categories.get(id)!).filter(Boolean),
      tags: tagIds.map(id => this.tags.get(id)!).filter(Boolean),
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
    const article = Array.from(this.articles.values()).find(a => a.slug === slug);
    if (!article) return undefined;
    return this.enrichArticle(article);
  }

  async getRelatedArticles(id: string): Promise<ArticleWithDetails[]> {
    const article = this.articles.get(id);
    if (!article || !article.clusterId) return [];
    
    const related = Array.from(this.articles.values())
      .filter(a => a.clusterId === article.clusterId && a.id !== id && a.status === "published");
      
    related.sort((a, b) => (b.publishedAt || b.createdAt).getTime() - (a.publishedAt || a.createdAt).getTime());
    
    return Promise.all(related.map(a => this.enrichArticle(a)));
  }

  /** Returns ALL articles without clusterId deduplication — used by topic search */
  async listAllArticlesRaw(limit: number = 5000): Promise<ArticleWithDetails[]> {
    const all = Array.from(this.articles.values())
      .filter(a => a.status === "published")
      .sort((a, b) => (b.publishedAt || b.createdAt).getTime() - (a.publishedAt || a.createdAt).getTime())
      .slice(0, limit);
    return Promise.all(all.map(a => this.enrichArticle(a)));
  }

  async listArticles(params: {
    status?: ArticleStatus;
    authorId?: string;
    publisherId?: string;
    categoryId?: string;
    bias?: Bias;
    search?: string;
    clusterId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ articles: ArticleWithDetails[]; total: number }> {
    let filtered = Array.from(this.articles.values());

    if (params.status) {
      filtered = filtered.filter(a => a.status === params.status);
    }
    if (params.authorId) {
      filtered = filtered.filter(a => a.authorId === params.authorId);
    }
    if (params.publisherId) {
      filtered = filtered.filter(a => a.publisherId === params.publisherId);
    }
    if (params.categoryId) {
      filtered = filtered.filter(a => {
        const cats = this.articleCategories.get(a.id) || [];
        return cats.includes(params.categoryId!);
      });
    }
    if (params.bias) {
      filtered = filtered.filter(a => a.bias === params.bias);
    }
    if (params.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(search) ||
        a.excerpt.toLowerCase().includes(search)
      );
    }

    // Filter by clusterId if provided (for AI insight engine full coverage)
    if (params.clusterId) {
      filtered = filtered.filter(a => a.clusterId === params.clusterId);
    } 
    // ONLY deduplicate by cluster if we are NOT already filtering for a specific cluster
    else {
      const clusterMap = new Map<string, Article>();
      filtered.forEach(article => {
        const cid = article.clusterId || article.id;
        if (!clusterMap.has(cid)) {
          clusterMap.set(cid, article);
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
    const id = insertArticle.id || Math.random().toString(36).substring(2);
    const article: Article = {
      ...insertArticle,
      id,
      clusterId: insertArticle.clusterId || null,
      importanceScore: insertArticle.importanceScore || 0,
      biasHistory: insertArticle.biasHistory || [],
      aiInsights: insertArticle.aiInsights || [],
      publishedAt: typeof insertArticle.publishedAt === 'string' ? new Date(insertArticle.publishedAt) : (insertArticle.publishedAt || null),
      fetchedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.articles.set(id, article);
    this.articleCategories.set(id, categoryIds);
    this.articleTags.set(id, tagIds);
    return article;
  }

  async updateArticle(id: string, data: Partial<Article>, categoryIds?: string[], tagIds?: string[]): Promise<Article> {
    const article = this.articles.get(id);
    if (!article) throw new Error("Article not found");
    const updated = {
      ...article,
      ...data,
      bias: data.bias !== undefined ? data.bias : article.bias,
      clusterId: data.clusterId !== undefined ? data.clusterId : article.clusterId,
      importanceScore: data.importanceScore !== undefined ? data.importanceScore : article.importanceScore,
      biasHistory: data.biasHistory !== undefined ? data.biasHistory : article.biasHistory,
      aiInsights: data.aiInsights !== undefined ? data.aiInsights : article.aiInsights,
      updatedAt: new Date(),
    };
    this.articles.set(id, updated);
    if (categoryIds) this.articleCategories.set(id, categoryIds);
    if (tagIds) this.articleTags.set(id, tagIds);
    return updated;
  }

  async deleteArticle(id: string): Promise<void> {
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
    const bookmarkIds = this.bookmarks.get(userId) || new Set();
    const articles = Array.from(bookmarkIds).map(id => this.articles.get(id)).filter(Boolean) as Article[];
    return Promise.all(articles.map(a => this.enrichArticle(a)));
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
    
    // Sort by view count descending
    published.sort((a, b) => {
      const viewsA = (this.articleViews.get(a.id) || []).length;
      const viewsB = (this.articleViews.get(b.id) || []).length;
      return viewsB - viewsA;
    });

    const top = published.slice(0, limit);
    return Promise.all(top.map(a => this.enrichArticle(a)));
  }

  async getBlindspotArticles(): Promise<{ leftBlindspot: ArticleWithDetails[]; rightBlindspot: ArticleWithDetails[] }> {
    const published = Array.from(this.articles.values()).filter(a => a.status === "published");
    
    // Left blindspot = stories mostly covered by left-leaning sources (right readers miss these)
    const leftOnly = published.filter(a => a.bias === "left");
    // Right blindspot = stories mostly covered by right-leaning sources (left readers miss these)
    const rightOnly = published.filter(a => a.bias === "right");

    const leftBlindspot = await Promise.all(leftOnly.slice(0, 10).map(a => this.enrichArticle(a)));
    const rightBlindspot = await Promise.all(rightOnly.slice(0, 10).map(a => this.enrichArticle(a)));

    return { leftBlindspot, rightBlindspot };
  }

  async trackReadingHistory(userId: string, articleId: string): Promise<ReadingHistoryEntry> {
    const entry: ReadingHistoryEntry = {
      id: randomUUID(),
      userId,
      articleId,
      readAt: new Date(),
      readDurationSec: null,
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
    
    let leftCount = 0;
    let centerCount = 0;
    let rightCount = 0;
    const publisherCounts: Map<string, { name: string; count: number; bias: string | null }> = new Map();

    for (const articleId of readArticleIds) {
      const article = this.articles.get(articleId);
      if (!article) continue;

      if (article.bias === "left") leftCount++;
      else if (article.bias === "center") centerCount++;
      else if (article.bias === "right") rightCount++;

      const publisher = this.publishers.get(article.publisherId);
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
      const min = Math.min(leftCount, centerCount, rightCount);
      if (min === leftCount) blindspotBias = "left";
      else if (min === rightCount) blindspotBias = "right";
      else blindspotBias = "center";
    }

    return {
      totalRead,
      leftCount,
      centerCount,
      rightCount,
      leftPercent: totalRead > 0 ? Math.round((leftCount / totalRead) * 100) : 0,
      centerPercent: totalRead > 0 ? Math.round((centerCount / totalRead) * 100) : 0,
      rightPercent: totalRead > 0 ? Math.round((rightCount / totalRead) * 100) : 0,
      topPublishers,
      blindspotBias,
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
    return event;
  }

  async getArticleShareCount(articleId: string): Promise<number> {
    return this.shareEventsStore.filter(s => s.articleId === articleId).length;
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
          if (prefs.preferredBias.includes(article.bias)) score += 3;
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser, insertProfile: InsertUserProfile): Promise<{ user: User; profile: UserProfile }> {
    return await db.transaction(async (tx) => {
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
    const [article] = await db.select().from(articles).where(eq(articles.id, id));
    if (!article) return undefined;
    return await this.enrichArticle(article);
  }

  async getArticleBySlug(slug: string): Promise<ArticleWithDetails | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.slug, slug));
    if (!article) return undefined;
    return await this.enrichArticle(article);
  }

  async getRelatedArticles(id: string): Promise<ArticleWithDetails[]> {
    const article = await this.getArticle(id);
    if (!article) return [];
    
    // Find articles in the same cluster if exists
    if (article.clusterId) {
       const related = await db.select().from(articles).where(and(eq(articles.clusterId, article.clusterId), sql`${articles.id} != ${id}`));
       return Promise.all(related.map(a => this.enrichArticle(a)));
    }
    
    // Fallback to same publisher
    const samePub = await db.select().from(articles).where(and(eq(articles.publisherId, article.publisherId), sql`${articles.id} != ${id}`)).limit(5);
    return Promise.all(samePub.map(a => this.enrichArticle(a)));
  }

  async listArticles(params: {
    status?: ArticleStatus;
    authorId?: string;
    publisherId?: string;
    categoryId?: string;
    bias?: Bias;
    search?: string;
    clusterId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ articles: ArticleWithDetails[]; total: number }> {
    let query = db.select().from(articles);
    let conditions = [];

    if (params.status) conditions.push(eq(articles.status, params.status));
    if (params.authorId) conditions.push(eq(articles.authorId, params.authorId));
    if (params.publisherId) conditions.push(eq(articles.publisherId, params.publisherId));
    if (params.bias) conditions.push(eq(articles.bias, params.bias));
    if (params.clusterId) conditions.push(eq(articles.clusterId, params.clusterId));
    if (params.search) {
      conditions.push(or(
        like(articles.title, `%${params.search}%`),
        like(articles.excerpt, `%${params.search}%`)
      ));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Total count
    const [countRes] = await db.select({ count: sql<number>`count(*)` }).from(articles).where(whereClause);
    const total = Number(countRes.count);

    // Paginated results
    const results = await db.select().from(articles)
      .where(whereClause)
      .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
      .limit(params.limit || 20)
      .offset(params.offset || 0);

    const enriched = await Promise.all(results.map((a: any) => this.enrichArticle(a)));
    return { articles: enriched, total };
  }

  async listAllArticlesRaw(limit: number = 5000): Promise<ArticleWithDetails[]> {
    const results = await db.select().from(articles)
      .where(eq(articles.status, 'published'))
      .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
      .limit(limit);
    return Promise.all(results.map((a: any) => this.enrichArticle(a)));
  }

  async createArticle(insertArticle: InsertArticle, categoryIds: string[], tagIds: string[]): Promise<Article> {
    const [article] = await db.insert(articles).values({
      ...insertArticle,
      id: insertArticle.id || randomUUID()
    } as any).returning();
    
    if (categoryIds.length > 0) {
      await db.insert(articleCategories).values(categoryIds.map(cid => ({ articleId: article.id, categoryId: cid })));
    }
    if (tagIds.length > 0) {
      await db.insert(articleTags).values(tagIds.map(tid => ({ articleId: article.id, tagId: tid })));
    }
    
    return article;
  }

  async updateArticle(id: string, data: Partial<Article>, categoryIds?: string[], tagIds?: string[]): Promise<Article> {
    const [updated] = await db.update(articles).set({ ...data, updatedAt: new Date() } as any).where(eq(articles.id, id)).returning();
    
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
    
    return updated;
  }

  async deleteArticle(id: string): Promise<void> {
    await db.delete(articles).where(eq(articles.id, id));
  }

  async publishArticle(id: string): Promise<Article> {
    const [published] = await db.update(articles).set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() }).where(eq(articles.id, id)).returning();
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
    
    return Promise.all(results.map((r: any) => this.enrichArticle(r.article)));
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
      .set({ fullContent: bodyHtml, updatedAt: new Date() })
      .where(eq(articles.id, id));
  }

  async getTrendingArticles(limit: number): Promise<ArticleWithDetails[]> {
    const trending = await db.select({ article: articles, views: sql<number>`count(${articleViews.id})` })
      .from(articles)
      .leftJoin(articleViews, eq(articles.id, articleViews.articleId))
      .where(eq(articles.status, 'published'))
      .groupBy(articles.id)
      .orderBy(desc(sql`count(${articleViews.id})`))
      .limit(limit);
    
    return Promise.all(trending.map((t: any) => this.enrichArticle(t.article)));
  }

  async getBlindspotArticles(): Promise<{ leftBlindspot: ArticleWithDetails[]; rightBlindspot: ArticleWithDetails[] }> {
    const left = await db.select().from(articles).where(and(eq(articles.status, 'published'), eq(articles.bias, 'left'))).limit(5);
    const right = await db.select().from(articles).where(and(eq(articles.status, 'published'), eq(articles.bias, 'right'))).limit(5);
    
    return {
      leftBlindspot: await Promise.all(left.map(a => this.enrichArticle(a))),
      rightBlindspot: await Promise.all(right.map(a => this.enrichArticle(a)))
    };
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
    
    return Promise.all(results.map(async r => ({
      ...r.history,
      article: await this.enrichArticle(r.article)
    })));
  }  async getMyNewsBias(userId: string): Promise<MyBiasStats> {
    const history = await db.select({ 
      bias: articles.bias,
      publisherId: articles.publisherId,
      publisherName: publishers.name
    })
      .from(readingHistory)
      .innerJoin(articles, eq(readingHistory.articleId, articles.id))
      .innerJoin(publishers, eq(articles.publisherId, publishers.id))
      .where(eq(readingHistory.userId, userId));
    
    const totalRead = history.length;
    const stats = {
      totalRead,
      leftCount: history.filter(h => h.bias === 'left').length,
      centerCount: history.filter(h => h.bias === 'center').length,
      rightCount: history.filter(h => h.bias === 'right').length,
    };

    // Calculate top publishers
    const pubStats = new Map<string, { name: string; count: number; bias: string | null }>();
    for (const h of history) {
      const existing = pubStats.get(h.publisherId) || { name: h.publisherName, count: 0, bias: h.bias };
      existing.count++;
      pubStats.set(h.publisherId, existing);
    }
    const topPublishers = Array.from(pubStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Determine blindspot
    let blindspotBias: string | null = null;
    if (totalRead > 0) {
      const counts = [
        { bias: 'left', count: stats.leftCount },
        { bias: 'center', count: stats.centerCount },
        { bias: 'right', count: stats.rightCount }
      ];
      counts.sort((a, b) => a.count - b.count);
      blindspotBias = counts[0].bias;
    }

    return {
      ...stats,
      leftPercent: totalRead ? Math.round((stats.leftCount / totalRead) * 100) : 0,
      centerPercent: totalRead ? Math.round((stats.centerCount / totalRead) * 100) : 0,
      rightPercent: totalRead ? Math.round((stats.rightCount / totalRead) * 100) : 0,
      topPublishers,
      blindspotBias
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
    const articlesList = await db.select().from(articles).where(eq(articles.status, 'published')).limit(limit);
    return Promise.all(articlesList.map(a => this.enrichArticle(a)));
  }

  async updateArticleContent(id: string, bodyHtml: string): Promise<void> {
    await db.update(articles).set({ bodyHtml, updatedAt: new Date() }).where(eq(articles.id, id));
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
    await db.delete(fetchQueue).where(eq(fetchQueue.status, 'pending'));
    const activePublishers = await db.select().from(publishers).where(eq(publishers.active, true));
    
    if (activePublishers.length > 0) {
      console.log(`Resetting fetch queue with ${activePublishers.length} publishers...`);
      // Chunk inserts for performance (1000 at a time)
      for (let i = 0; i < activePublishers.length; i += 1000) {
        const chunk = activePublishers.slice(i, i + 1000);
        await db.insert(fetchQueue).values(chunk.map(p => ({
          publisherId: p.id,
          status: 'pending' as any
        })));
        console.log(`...inserted ${i + chunk.length} into queue`);
      }
    }
  }

  async updateArticleContent(id: string, bodyHtml: string): Promise<void> {
    await db.update(articles)
      .set({ fullContent: bodyHtml })
      .where(eq(articles.id, id));
  }

  private async enrichArticle(article: Article): Promise<ArticleWithDetails> {
    const [publisher] = await db.select().from(publishers).where(eq(publishers.id, article.publisherId));
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, article.authorId));
    
    const cats = await db.select({ category: categories })
      .from(articleCategories)
      .innerJoin(categories, eq(articleCategories.categoryId, categories.id))
      .where(eq(articleCategories.articleId, article.id));
      
    const tgs = await db.select({ tag: tags })
      .from(articleTags)
      .innerJoin(tags, eq(articleTags.tagId, tags.id))
      .where(eq(articleTags.articleId, article.id));

    // Count how many publishers cover a similar topic based on clusterId
    let sourceCount = 1;
    if (article.clusterId) {
      const [res] = await db.select({ count: sql<number>`count(distinct ${articles.publisherId})` })
        .from(articles)
        .where(and(eq(articles.clusterId, article.clusterId), eq(articles.status, 'published')));
      sourceCount = Number(res.count);
    } else {
      // Fallback: search for same categories
      const categoryIds = cats.map(c => c.category.id);
      if (categoryIds.length > 0) {
        const [res] = await db.select({ count: sql<number>`count(distinct ${articles.publisherId})` })
          .from(articles)
          .innerJoin(articleCategories, eq(articles.id, articleCategories.articleId))
          .where(and(
            sql`${articleCategories.categoryId} IN ${categoryIds}`,
            eq(articles.status, 'published')
          ));
        sourceCount = Number(res.count);
      }
    }

    return {
      ...article,
      publisher: publisher!,
      author: profile!,
      categories: cats.map(c => c.category),
      tags: tgs.map(t => t.tag),
      sourceCount
    };
  }
}

export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
