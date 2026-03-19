import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum, integer, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "editor"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended"]);
export const articleStatusEnum = pgEnum("article_status", ["draft", "review", "published", "archived"]);
export const biasEnum = pgEnum("bias", ["left", "center", "right"]);
export const mediaTypeEnum = pgEnum("media_type", ["image", "video", "embed"]);
export const factualityEnum = pgEnum("factuality", ["very_high", "high", "mixed", "low", "very_low"]);
export const ownerTypeEnum = pgEnum("owner_type", ["corporation", "individual", "nonprofit", "government", "unknown"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("editor"),
  status: userStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const publishers = pgTable("publishers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  logoUrl: text("logo_url"),
  website: text("website"),
  rssUrl: text("rss_url"), // NEW: for automated fetching
  biasRating: biasEnum("bias_rating"),
  factualityRating: factualityEnum("factuality_rating"),
  ownerName: text("owner_name"),
  ownerType: ownerTypeEnum("owner_type"),
  country: text("country").notNull().default("US"), // NEW
  language: text("language").notNull().default("en"), // NEW
  active: boolean("active").notNull().default(true), // NEW: for disabling broken sources
  failCount: integer("fail_count").notNull().default(0), // NEW: auto-disable after 10 fails
  lastFetchedAt: timestamp("last_fetched_at"), // NEW
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const articles = pgTable("articles", {
  id: varchar("id").primaryKey(), // NEW: will use MD5(URL+Title) for deduplication
  publisherId: varchar("publisher_id").notNull().references(() => publishers.id, { onDelete: "restrict" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  bodyHtml: text("body_html").notNull(),
  heroImageUrl: text("hero_image_url"),
  sourceUrl: text("source_url"),
  fullContent: text("full_content"),
  status: articleStatusEnum("status").notNull().default("draft"),
  bias: biasEnum("bias").notNull(),
  clusterId: text("cluster_id"), // NEW: for story grouping
  importanceScore: integer("importance_score").notNull().default(0), // NEW: 0 to 100
  biasHistory: jsonb("bias_history").$type<Array<{timestamp: string, left: number, center: number, right: number}>>().default([]),
  aiInsights: jsonb("ai_insights").$type<string[]>().default([]),
  publishedAt: timestamp("published_at"),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(), // NEW
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("articles_slug_idx").on(table.slug),
  publisherIdx: index("articles_publisher_idx").on(table.publisherId),
  authorIdx: index("articles_author_idx").on(table.authorId),
  statusIdx: index("articles_status_idx").on(table.status),
  publishedAtIdx: index("articles_published_at_idx").on(table.publishedAt),
  clusterIdx: index("articles_cluster_idx").on(table.clusterId),
  fetchedAtIdx: index("articles_fetched_at_idx").on(table.fetchedAt),
}));

export const articleCategories = pgTable("article_categories", {
  articleId: varchar("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: uniqueIndex("article_categories_pk").on(table.articleId, table.categoryId),
}));

export const articleTags = pgTable("article_tags", {
  articleId: varchar("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: uniqueIndex("article_tags_pk").on(table.articleId, table.tagId),
}));

export const articleMedia = pgTable("article_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  type: mediaTypeEnum("type").notNull().default("image"),
  url: text("url").notNull(),
  caption: text("caption"),
  credits: text("credits"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const articleViews = pgTable("article_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  viewerId: varchar("viewer_id").references(() => users.id, { onDelete: "set null" }),
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
  referrer: text("referrer"),
  metadata: jsonb("metadata"),
}, (table) => ({
  articleIdx: index("article_views_article_idx").on(table.articleId),
  viewedAtIdx: index("article_views_viewed_at_idx").on(table.viewedAt),
}));

export const bookmarks = pgTable("bookmarks", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  articleId: varchar("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  pk: uniqueIndex("bookmarks_pk").on(table.userId, table.articleId),
}));

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("sessions_user_idx").on(table.userId),
  expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
}));

// --- Ground News Advanced Features ---

export const readingHistory = pgTable("reading_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  articleId: varchar("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").notNull().defaultNow(),
  readDurationSec: integer("read_duration_sec"),
}, (table) => ({
  userIdx: index("reading_history_user_idx").on(table.userId),
  articleIdx: index("reading_history_article_idx").on(table.articleId),
}));

export const userPreferences = pgTable("user_preferences", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  followedTopics: jsonb("followed_topics").$type<string[]>().default([]),
  followedCategories: jsonb("followed_categories").$type<string[]>().default([]),
  preferredBias: jsonb("preferred_bias").$type<string[]>().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const shareEvents = pgTable("share_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  platform: text("platform").notNull(), // "copy", "twitter", "facebook", "whatsapp"
  sharedAt: timestamp("shared_at").notNull().defaultNow(),
}, (table) => ({
  articleIdx: index("share_events_article_idx").on(table.articleId),
}));

export const fetchQueue = pgTable("fetch_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  publisherId: varchar("publisher_id").notNull().references(() => publishers.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "running", "done", "failed"] }).notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("fetch_queue_status_idx").on(table.status),
}));

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default("global"), // strictly one row usually
  fetchCountry: text("fetch_country").notNull().default("US"),
  fetchLanguage: text("fetch_language").notNull().default("en"),
  localNewsKeywords: text("local_news_keywords"), // e.g. "Austin, Texas"
  activeTopics: jsonb("active_topics").$type<string[]>().default([]),
  useBrowserLocation: boolean("use_browser_location").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Zod Schemas ---

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email(),
  passwordHash: z.string().min(60),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  updatedAt: true,
}).extend({
  displayName: z.string().min(1).max(100),
});

export const insertPublisherSchema = createInsertSchema(publishers).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().optional(), // allow custom IDs
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  rssUrl: z.string().url().optional().nullable(),
  country: z.string().min(2).max(10).default("US"),
  language: z.string().min(2).max(10).default("en"),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  createdAt: true,
  updatedAt: true,
  fetchedAt: true,
}).extend({
  id: z.string().optional(), // allow custom IDs (MD5)
  publishedAt: z.date().or(z.string()).optional().nullable(),
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().min(1).max(1000),
  bodyHtml: z.string().min(1),
  sourceUrl: z.string().url().optional().nullable(),
  fullContent: z.string().optional().nullable(),
  importanceScore: z.number().int().min(0).max(100).default(0),
  biasHistory: z.array(z.object({
    timestamp: z.string(),
    left: z.number(),
    center: z.number(),
    right: z.number(),
  })).default([]),
});

export const insertArticleCategorySchema = createInsertSchema(articleCategories);
export const insertArticleTagSchema = createInsertSchema(articleTags);
export const insertArticleMediaSchema = createInsertSchema(articleMedia).omit({
  id: true,
  createdAt: true,
});
export const insertArticleViewSchema = createInsertSchema(articleViews).omit({
  id: true,
  viewedAt: true,
});
export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
  createdAt: true,
});
export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});
export const insertFetchQueueSchema = createInsertSchema(fetchQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  updatedAt: true,
}).extend({
  activeTopics: z.array(z.string()).nullable().default([]),
});

// --- Types ---

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type Publisher = typeof publishers.$inferSelect;
export type InsertPublisher = z.infer<typeof insertPublisherSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type ArticleCategory = typeof articleCategories.$inferSelect;
export type InsertArticleCategory = z.infer<typeof insertArticleCategorySchema>;
export type ArticleTag = typeof articleTags.$inferSelect;
export type InsertArticleTag = z.infer<typeof insertArticleTagSchema>;
export type ArticleMedia = typeof articleMedia.$inferSelect;
export type InsertArticleMedia = z.infer<typeof insertArticleMediaSchema>;
export type ArticleView = typeof articleViews.$inferSelect;
export type InsertArticleView = z.infer<typeof insertArticleViewSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type FetchQueue = typeof fetchQueue.$inferSelect;
export type InsertFetchQueue = z.infer<typeof insertFetchQueueSchema>;

export type ReadingHistoryEntry = typeof readingHistory.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;
export type ShareEvent = typeof shareEvents.$inferSelect;
export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;

export type ArticleWithDetails = Article & {
  publisher: Publisher;
  author: UserProfile;
  categories: Category[];
  tags: Tag[];
  viewCount?: number;
  shareCount?: number;
  sourceCount?: number;
};

export type MyBiasStats = {
  totalRead: number;
  leftCount: number;
  centerCount: number;
  rightCount: number;
  leftPercent: number;
  centerPercent: number;
  rightPercent: number;
  topPublishers: { name: string; count: number; bias: string | null }[];
  blindspotBias: string | null; // which bias you read least
};

export type UserRole = User["role"];
export type ArticleStatus = Article["status"];
export type Bias = Article["bias"];
export type Factuality = Publisher["factualityRating"];
export type OwnerType = Publisher["ownerType"];
