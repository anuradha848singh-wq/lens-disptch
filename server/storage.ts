import { 
  type User, type InsertUser, type UserProfile, type InsertUserProfile,
  type Publisher, type InsertPublisher,
  type Category, type InsertCategory,
  type Tag, type InsertTag,
  type Article, type InsertArticle, type ArticleWithDetails,
  type ArticleView, type InsertArticleView,
  type Bookmark, type InsertBookmark,
  type Session, type InsertSession,
  type ArticleStatus, type Bias
} from "@shared/schema";
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
  listArticles(params: {
    status?: ArticleStatus;
    authorId?: string;
    publisherId?: string;
    categoryId?: string;
    bias?: Bias;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ articles: ArticleWithDetails[]; total: number }>;
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
  private bookmarks: Map<string, Set<string>>;
  private sessions: Map<string, Session>;

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
    const id = randomUUID();
    const publisher: Publisher = {
      id,
      name: insertPublisher.name,
      slug: insertPublisher.slug,
      description: insertPublisher.description || null,
      logoUrl: insertPublisher.logoUrl || null,
      website: insertPublisher.website || null,
      biasRating: insertPublisher.biasRating || null,
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

    return {
      ...article,
      publisher: publisher!,
      author: authorProfile!,
      categories: categoryIds.map(id => this.categories.get(id)!).filter(Boolean),
      tags: tagIds.map(id => this.tags.get(id)!).filter(Boolean),
      viewCount: views.length,
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

  async listArticles(params: {
    status?: ArticleStatus;
    authorId?: string;
    publisherId?: string;
    categoryId?: string;
    bias?: Bias;
    search?: string;
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

  async createArticle(insertArticle: InsertArticle, categoryIds: string[], tagIds: string[]): Promise<Article> {
    const id = randomUUID();
    const article: Article = {
      id,
      publisherId: insertArticle.publisherId,
      authorId: insertArticle.authorId,
      title: insertArticle.title,
      slug: insertArticle.slug,
      excerpt: insertArticle.excerpt,
      bodyHtml: insertArticle.bodyHtml,
      heroImageUrl: insertArticle.heroImageUrl || null,
      status: insertArticle.status || "draft",
      bias: insertArticle.bias,
      publishedAt: null,
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
    const updated = { ...article, ...data, updatedAt: new Date() };
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
}

export const storage = new MemStorage();
