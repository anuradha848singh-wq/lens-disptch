import { sql } from "drizzle-orm";
import { pgTable, serial, text, varchar, timestamp, pgEnum, integer, boolean, jsonb, index, uniqueIndex, customType } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "editor"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended"]);
export const articleStatusEnum = pgEnum("article_status", ["draft", "review", "published", "archived"]);
export const biasEnum = pgEnum("bias", ["pro_establishment", "pro_opposition", "regional_aligned", "neutral"]);
export const mediaTypeEnum = pgEnum("media_type", ["image", "video", "embed"]);
export const factualityEnum = pgEnum("factuality", ["very_high", "high", "mixed", "low", "very_low"]);
export const ownerTypeEnum = pgEnum("owner_type", ["corporation", "individual", "nonprofit", "government", "unknown"]);

export const EMBEDDING_DIM = 384;

export const vector = customType<{ data: number[] }>({
  dataType() {
    return `vector(${EMBEDDING_DIM})`;
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown) {
    if (typeof value !== "string") return [];
    return value.slice(1, -1).split(",").map(Number);
  },
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("editor"),
  status: userStatusEnum("status").notNull().default("active"),
  preferences: jsonb("preferences").$type<Record<string, any>>().default({}),
  interestVector: vector("interest_vector"),
  biasProfile: jsonb("bias_profile").$type<Record<string, number>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  joinDate: timestamp("join_date").notNull().defaultNow(),
  balanceScore: integer("balance_score").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const publishers = pgTable("publishers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  logoUrl: text("logo_url"),
  website: text("website"),
  rssUrl: text("rss_url"), 
  biasRating: biasEnum("bias_rating"),
  factualityRating: factualityEnum("factuality_rating"),
  ownerName: text("owner_name"),
  promoterGroup: text("promoter_group"),
  ownerType: ownerTypeEnum("owner_type"),
  country: text("country").notNull().default("US"), 
  language: text("language").notNull().default("en"), 
  active: boolean("active").notNull().default(true), 
  failCount: integer("fail_count").notNull().default(0), 
  lastFetchedAt: timestamp("last_fetched_at"), 
  lastEtag: text("last_etag"), 
  lastModified: text("last_modified"), 
  factualityScore: integer("factuality_score"),
  factualityTier: text("factuality_tier", { enum: ["exemplary", "high", "standard", "mixed", "low"] }),
  mbfcRating: text("mbfc_rating"), // E.g., "Very High", "High"
  mbfcUrl: text("mbfc_url"),
  newsguardScore: integer("newsguard_score"),
  ifcnSignatory: boolean("ifcn_signatory").notNull().default(false),
  hasCorrectionsPolicy: boolean("has_corrections_policy").notNull().default(false),
  hasOwnershipDisclosure: boolean("has_ownership_disclosure").notNull().default(false),
  hasOpinionLabeling: boolean("has_opinion_labeling").notNull().default(false),
  hasCorrectionsArchive: boolean("has_corrections_archive").notNull().default(false),
  communityFlags: integer("community_flags").notNull().default(0),
  factualityLastUpdated: timestamp("factuality_last_updated"),
  reliabilityScore: integer("reliability_score").notNull().default(60), // dynamic 0-100
  uniquenessScore: integer("uniqueness_score").notNull().default(50),  // original reporting freq
  correctionRate: integer("correction_rate").notNull().default(0),     // corrections/total
  consistencyScore: integer("consistency_score").notNull().default(70), // self-contradiction tracking
  lastReliabilityUpdate: timestamp("last_reliability_update").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  activeLastFetchedIdx: index("publishers_active_last_fetched_idx").on(table.active, table.lastFetchedAt),
  failCountIdx: index("publishers_fail_count_idx").on(table.failCount),
}));

export const clusters = pgTable("clusters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  headline: text("headline").notNull(),
  summary: text("summary"),
  firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
  lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(),
  sourceCount: integer("source_count").notNull().default(0),
  proEstablishmentCount: integer("pro_establishment_count").notNull().default(0),
  proOppositionCount: integer("pro_opposition_count").notNull().default(0),
  regionalAlignedCount: integer("regional_aligned_count").notNull().default(0),
  neutralCount: integer("neutral_count").notNull().default(0),
  importanceScore: integer("importance_score").notNull().default(0),
  velocityScore: integer("velocity_score").notNull().default(0),
  qualityScore: integer("quality_score").notNull().default(0),
  divergenceScore: integer("divergence_score").notNull().default(0),   // 0-100: narrative disagreement
  confidenceScore: integer("confidence_score").notNull().default(50),  // 0-100: story certainty
  narrativeLabel: text("narrative_label", {
    enum: ["confirmed", "developing", "disputed"]
  }).notNull().default("developing"),
  categorySlug: text("category_slug"),   // denormalised for diversity guard
  storyPhase: text("story_phase", {
    enum: ["breaking", "developing", "analysis", "settled"]
  }).notNull().default("developing"),
  trendingScore: integer("trending_score").notNull().default(0),
  blindspotScore: integer("blindspot_score").notNull().default(0),
  blindspotSide: text("blindspot_side", { enum: ["pro_establishment", "pro_opposition", "regional_aligned", "neutral"] }),
  hasCorrection: boolean("has_correction").notNull().default(false),
  correctionNote: text("correction_note"),
  aiSummary: jsonb("ai_summary").$type<{
    left?: string;
    center?: string;
    right?: string;
    synthesis?: string;
  } | string[]>().default([]),
  aiFramingDiff: text("ai_framing_diff"),
  aiEnrichedAt: timestamp("ai_enriched_at"),
  // --- Premium Features (FLAN-T5 Powered) ---
  aiForeignGaze: jsonb("ai_foreign_gaze").$type<{
    domestic_summary: string;
    foreign_summary: string;
    difference: string;
    domestic_sources: string[];
    foreign_sources: string[];
  } | null>(),
  aiMarketTickers: jsonb("ai_market_tickers").$type<{
    tickers: string[];
    companies: string[];
    extracted_from: string;
  } | null>(),
  aiEntityQuotes: jsonb("ai_entity_quotes").$type<{
    entity: string;
    quote: string;
    topic: string;
    source: string;
  }[]>().default([]),
  aiExecutiveBriefing: jsonb("ai_executive_briefing").$type<{
    summary: string;
    key_players: string[];
    timeline: string[];
    discrepancies: string[];
    generated_at: string;
  } | null>(),
  // --- Editorial Intelligence 2.0 (Industry Standard) ---
  geographyAggs: jsonb("geography_aggs").$type<Record<string, number>>().default({}),
  shannonDiversity: integer("shannon_diversity").notNull().default(0), // 0-100
  originPublisherId: varchar("origin_publisher_id").references(() => publishers.id),
  originPublishedAt: timestamp("origin_published_at"),
  primaryMarket: varchar("primary_market").notNull().default("US"),
  multiMarket: jsonb("multi_market").$type<string[]>().default([]),
}, (table) => ({
  importanceIdx: index("clusters_importance_idx").on(table.importanceScore),
  trendingIdx: index("clusters_trending_idx").on(table.trendingScore),
  blindspotIdx: index("clusters_blindspot_idx").on(table.blindspotScore),
  lastUpdatedIdx: index("clusters_last_updated_idx").on(table.lastUpdatedAt),
  sourceCountIdx: index("clusters_source_count_idx").on(table.sourceCount),
  divergenceIdx: index("clusters_divergence_idx").on(table.divergenceScore),
  categoryIdx: index("clusters_category_idx").on(table.categorySlug),
  importanceFirstSeenIdx: index("clusters_importance_first_seen_idx").on(table.importanceScore, table.firstSeenAt),
}));

export const clusterCentroids = pgTable("cluster_centroids", {
  clusterId: varchar("cluster_id").primaryKey().references(() => clusters.id, { onDelete: "cascade" }),
  centroid: vector("centroid").notNull(),
  articleCount: integer("article_count").notNull().default(1),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  centroidIdx: index("idx_cluster_centroids_hnsw")
    .using("hnsw", table.centroid.op("vector_cosine_ops"))
    .with({ m: 16, ef_construction: 64 }),
}));

export const clusterScores = pgTable("cluster_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clusterId: varchar("cluster_id").notNull().references(() => clusters.id, { onDelete: "cascade" }),
  countryCode: varchar("country_code").notNull(),
  biasModel: varchar("bias_model").notNull(),
  scoreData: jsonb("score_data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  pk: uniqueIndex("cluster_scores_pk").on(table.clusterId, table.countryCode),
}));

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const homepageCache = pgTable("homepage_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categorySlug: text("category_slug").notNull().default("all"),
  data: jsonb("data").notNull(), // Array of Story objects
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  categoryIdx: index("homepage_cache_category_idx").on(table.categorySlug),
}));

export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const articles = pgTable("articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), 
  sourceId: varchar("source_id").notNull().references(() => publishers.id, { onDelete: "cascade" }),
  clusterId: varchar("cluster_id").references(() => clusters.id, { onDelete: "set null" }),
  isEmbedded: boolean("is_embedded").notNull().default(false),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  bodyClean: text("body_clean"),
  excerpt: text("excerpt"),
  bodyHtml: text("body_html").notNull(),
  fullContent: text("full_content"),
  url: text("url").notNull().unique(),
  sourceUrl: text("source_url"),
  heroImageUrl: text("hero_image_url"),
  status: articleStatusEnum("status").notNull().default("published"),
  publishedAt: timestamp("published_at"),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  embedding: vector("embedding"),
  biasScore: integer("bias_score"), // -1.0 to 1.0 represented as integer
  importanceScore: integer("importance_score").notNull().default(0),
  visibilityState: text("visibility_state", { enum: ["visible", "low_priority", "hidden", "archived"] }).notNull().default("visible"),
  qualityScore: integer("quality_score").notNull().default(0),
  readabilityScore: integer("readability_score"),
  entities: jsonb("entities"),
  domain: text("domain"),
  trace: jsonb("trace").$type<Record<string, any>>().notNull().default({}),
  aiInsights: jsonb("ai_insights").$type<string[]>().default([]),
  biasHistory: jsonb("bias_history").$type<any[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("articles_slug_idx").on(table.slug),
  sourceIdx: index("articles_source_idx").on(table.sourceId),
  clusterIdx: index("articles_cluster_idx").on(table.clusterId),
  urlIdx: uniqueIndex("articles_url_idx").on(table.url),
  publishedAtIdx: index("articles_published_at_idx").on(table.publishedAt),
  fetchedAtIdx: index("articles_fetched_at_idx").on(table.fetchedAt),
  // NEW — most common query filters
  statusIdx: index("articles_status_idx").on(table.status),
  visibilityIdx: index("articles_visibility_idx").on(table.visibilityState),
  importanceIdx: index("articles_importance_idx").on(table.importanceScore),
  statusPublishedAtIdx: index("articles_status_published_at_idx").on(table.status, table.publishedAt),
  statusVisibilityPublishedIdx: index("articles_status_visibility_published_idx").on(table.status, table.visibilityState, table.publishedAt),
}));

export const articleCategories = pgTable("article_categories", {
  articleId: varchar("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: uniqueIndex("article_categories_pk").on(table.articleId, table.categoryId),
  categoryIdx: index("article_categories_category_idx").on(table.categoryId),
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

export const articleEmbeddings = pgTable("article_embeddings", {
  articleId: varchar("article_id").primaryKey().references(() => articles.id, { onDelete: "cascade" }),
  embedding: vector("embedding").notNull(),
  embeddedAt: timestamp("embedded_at").notNull().defaultNow(),
  modelVersion: text("model_version").notNull().default("e5-small-v2"),
}, (table) => ({
  articleIdIdx: index("idx_ae_article_id").on(table.articleId),
}));

// --- The Lens Dispatch Advanced Features ---

export const readingHistory = pgTable("reading_history", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  articleId: varchar("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").notNull().defaultNow(),
}, (table) => ({
  pk: uniqueIndex("reading_history_pk").on(table.userId, table.articleId),
  userIdx: index("reading_history_user_idx").on(table.userId),
}));

export const userInteractions = pgTable("user_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clusterId: varchar("cluster_id").notNull().references(() => clusters.id, { onDelete: "cascade" }),
  action: text("action", { enum: ["click", "read", "upvote", "share"] }).notNull(),
  durationMs: integer("duration_ms").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("user_interactions_user_idx").on(table.userId),
  clusterIdx: index("user_interactions_cluster_idx").on(table.clusterId),
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
  platform: text("platform").notNull(), 
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
  id: varchar("id").primaryKey().default("global"), 
  fetchCountry: text("fetch_country").notNull().default("US"),
  fetchLanguage: text("fetch_language").notNull().default("en"),
  localNewsKeywords: text("local_news_keywords"), 
  activeTopics: jsonb("active_topics").$type<string[]>().default([]),
  useBrowserLocation: boolean("use_browser_location").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clusterId: varchar("cluster_id").notNull().references(() => clusters.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id"), 
  content: text("content").notNull(),
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  isAnonymous: boolean("is_anonymous").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const commentVotes = pgTable("comment_votes", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  commentId: varchar("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  vote: integer("vote").notNull(), // 1 or -1
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  pk: uniqueIndex("comment_votes_pk").on(table.userId, table.commentId),
}));

export const communityRatings = pgTable("community_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clusterId: varchar("cluster_id").notNull().references(() => clusters.id, { onDelete: "cascade" }),
  ratingType: text("rating_type", { enum: ["bias", "factuality"] }).notNull(),
  ratingValue: text("rating_value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  pk: uniqueIndex("community_ratings_pk").on(table.userId, table.clusterId, table.ratingType),
}));

export const userFollows = pgTable("user_follows", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetId: varchar("target_id").notNull(),
  targetType: text("target_type", { enum: ["user", "topic", "outlet"] }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  pk: uniqueIndex("user_follows_pk").on(table.userId, table.targetId, table.targetType),
}));


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
  id: z.string().optional(), 
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  rssUrl: z.string().url().optional().nullable(),
  reliabilityScore: z.number().int().min(0).max(100).default(100),
  country: z.string().min(2).max(10).default("US"),
  language: z.string().min(2).max(10).default("en"),
});

export const insertClusterSchema = createInsertSchema(clusters).omit({
  firstSeenAt: true,
  lastUpdatedAt: true,
});

export const insertClusterScoreSchema = createInsertSchema(clusterScores).omit({
  id: true,
  createdAt: true,
});

export const insertClusterCentroidSchema = createInsertSchema(clusterCentroids).omit({
  updatedAt: true,
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
  id: z.string().uuid().optional(), 
  sourceId: z.string(),
  clusterId: z.string().uuid().optional().nullable(),
  publishedAt: z.date().or(z.string()).optional().nullable(),
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/),
  bodyClean: z.string().optional().nullable(),
  bodyHtml: z.string().min(1),
  url: z.string().url(),
  domain: z.string().optional().nullable(),
  visibilityState: z.enum(["visible", "low_priority", "hidden", "archived"]).optional(),
  trace: z.record(z.any()).optional(),
  biasScore: z.number().optional().nullable(),
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

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentVoteSchema = createInsertSchema(commentVotes).omit({
  createdAt: true,
});

export const insertCommunityRatingSchema = createInsertSchema(communityRatings).omit({
  id: true,
  createdAt: true,
});

// --- Types ---

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type Publisher = typeof publishers.$inferSelect;
export type InsertPublisher = z.infer<typeof insertPublisherSchema>;
export type Cluster = typeof clusters.$inferSelect;
export type InsertCluster = z.infer<typeof insertClusterSchema>;
export type ClusterScore = typeof clusterScores.$inferSelect;
export type InsertClusterScore = z.infer<typeof insertClusterScoreSchema>;
export type ClusterCentroid = typeof clusterCentroids.$inferSelect;
export type InsertClusterCentroid = z.infer<typeof insertClusterCentroidSchema>;
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

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type CommentVote = typeof commentVotes.$inferSelect;
export type InsertCommentVote = z.infer<typeof insertCommentVoteSchema>;
export type CommunityRating = typeof communityRatings.$inferSelect;
export type InsertCommunityRating = z.infer<typeof insertCommunityRatingSchema>;

export type ArticleWithDetails = Article & {
  publisher: Publisher;
  categories: Category[];
  tags: Tag[];
  bias: Bias | null;
  viewCount?: number;
  shareCount?: number;
  sourceCount?: number;
  velocityScore?: number;
  storyPhase?: string;
  hasCorrection?: boolean;
  correctionNote?: string | null;
  publisherNames?: string;
  // Quality signals (from cluster)
  divergenceScore?: number;
  confidenceScore?: number;
  narrativeLabel?: "confirmed" | "developing" | "disputed";
  qualityScore?: number;
  biasLabel?: string; 
  proEstablishmentCount?: number;
  proOppositionCount?: number;
  regionalAlignedCount?: number;
  neutralCount?: number;
  shannonDiversity?: number;
  isDiversityPick?: boolean;
  primaryMarket?: string;
  multiMarket?: string[];
  scores?: any[]; // Array of ClusterScore
};

export type MyBiasStats = {
  totalRead: number;
  proEstablishmentCount: number;
  proOppositionCount: number;
  regionalAlignedCount: number;
  neutralCount: number;
  proEstablishmentPercent: number;
  proOppositionPercent: number;
  regionalAlignedPercent: number;
  neutralPercent: number;
  alarmingPercent: number;
  hopefulPercent: number;
  shannonDiversity: number;
  diversityLabel: string;
  topPublishers: { name: string; count: number; bias: string | null }[];
  blindspotBias: string | null; 
  biasDistribution: Record<string, number>; 
};

export type UserRole = "admin" | "editor";
export type ArticleStatus = "draft" | "review" | "published" | "archived";
export type Bias = "pro_establishment" | "pro_opposition" | "regional_aligned" | "neutral";
export type Factuality = "very_high" | "high" | "mixed" | "low" | "very_low";
export type OwnerType = "corporation" | "individual" | "nonprofit" | "government" | "unknown";

export function calculateCosineSimilarity(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
  }
  return dotProduct; // Already normalized
}

export const deadLetterArticles = pgTable("dead_letter_articles", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  error: text("error"),
  failedAt: timestamp("failed_at").defaultNow(),
  retryCount: integer("retry_count").default(0),
  payload: jsonb("payload"),
});
