import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum, integer, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "editor"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended"]);
export const articleStatusEnum = pgEnum("article_status", ["draft", "review", "published", "archived"]);
export const biasEnum = pgEnum("bias", ["left", "center", "right"]);
export const mediaTypeEnum = pgEnum("media_type", ["image", "video", "embed"]);

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
  biasRating: biasEnum("bias_rating"),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  publisherId: varchar("publisher_id").notNull().references(() => publishers.id, { onDelete: "restrict" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  bodyHtml: text("body_html").notNull(),
  heroImageUrl: text("hero_image_url"),
  status: articleStatusEnum("status").notNull().default("draft"),
  bias: biasEnum("bias").notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("articles_slug_idx").on(table.slug),
  publisherIdx: index("articles_publisher_idx").on(table.publisherId),
  authorIdx: index("articles_author_idx").on(table.authorId),
  statusIdx: index("articles_status_idx").on(table.status),
  publishedAtIdx: index("articles_published_at_idx").on(table.publishedAt),
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
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
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
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
}).extend({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().min(1).max(1000),
  bodyHtml: z.string().min(1),
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

export type ArticleWithDetails = Article & {
  publisher: Publisher;
  author: UserProfile;
  categories: Category[];
  tags: Tag[];
  viewCount?: number;
};

export type UserRole = User["role"];
export type ArticleStatus = Article["status"];
export type Bias = Article["bias"];
