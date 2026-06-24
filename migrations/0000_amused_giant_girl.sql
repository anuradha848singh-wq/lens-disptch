CREATE TYPE "public"."article_status" AS ENUM('draft', 'review', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."bias" AS ENUM('far_left', 'left', 'center_left', 'center', 'center_right', 'right', 'far_right');--> statement-breakpoint
CREATE TYPE "public"."factuality" AS ENUM('very_high', 'high', 'mixed', 'low', 'very_low');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('image', 'video', 'embed');--> statement-breakpoint
CREATE TYPE "public"."owner_type" AS ENUM('corporation', 'individual', 'nonprofit', 'government', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'editor');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TABLE "article_categories" (
	"article_id" varchar NOT NULL,
	"category_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_embeddings" (
	"article_id" varchar PRIMARY KEY NOT NULL,
	"embedding" vector(384) NOT NULL,
	"embedded_at" timestamp DEFAULT now() NOT NULL,
	"model_version" text DEFAULT 'e5-small-v2' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_media" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" varchar NOT NULL,
	"type" "media_type" DEFAULT 'image' NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"credits" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_tags" (
	"article_id" varchar NOT NULL,
	"tag_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" varchar NOT NULL,
	"viewer_id" varchar,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	"referrer" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" varchar NOT NULL,
	"cluster_id" varchar,
	"is_embedded" boolean DEFAULT false NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"body_clean" text,
	"excerpt" text,
	"body_html" text NOT NULL,
	"full_content" text,
	"url" text NOT NULL,
	"source_url" text,
	"hero_image_url" text,
	"status" "article_status" DEFAULT 'published' NOT NULL,
	"published_at" timestamp,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"embedding" vector(384),
	"bias_score" integer,
	"importance_score" integer DEFAULT 0 NOT NULL,
	"visibility_state" text DEFAULT 'visible' NOT NULL,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"readability_score" integer,
	"entities" jsonb,
	"domain" text,
	"trace" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_insights" jsonb DEFAULT '[]'::jsonb,
	"bias_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "articles_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"user_id" varchar NOT NULL,
	"article_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "clusters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"headline" text NOT NULL,
	"summary" text,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL,
	"source_count" integer DEFAULT 0 NOT NULL,
	"left_count" integer DEFAULT 0 NOT NULL,
	"center_count" integer DEFAULT 0 NOT NULL,
	"right_count" integer DEFAULT 0 NOT NULL,
	"importance_score" integer DEFAULT 0 NOT NULL,
	"velocity_score" integer DEFAULT 0 NOT NULL,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"divergence_score" integer DEFAULT 0 NOT NULL,
	"confidence_score" integer DEFAULT 50 NOT NULL,
	"narrative_label" text DEFAULT 'developing' NOT NULL,
	"category_slug" text,
	"story_phase" text DEFAULT 'developing' NOT NULL,
	"trending_score" integer DEFAULT 0 NOT NULL,
	"blindspot_score" integer DEFAULT 0 NOT NULL,
	"blindspot_side" text,
	"has_correction" boolean DEFAULT false NOT NULL,
	"correction_note" text,
	"ai_summary" jsonb DEFAULT '[]'::jsonb,
	"ai_framing_diff" text,
	"ai_enriched_at" timestamp,
	"ai_foreign_gaze" jsonb,
	"ai_market_tickers" jsonb,
	"ai_entity_quotes" jsonb DEFAULT '[]'::jsonb,
	"ai_executive_briefing" jsonb,
	"geography_aggs" jsonb DEFAULT '{}'::jsonb,
	"shannon_diversity" integer DEFAULT 0 NOT NULL,
	"origin_publisher_id" varchar,
	"origin_published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "fetch_queue" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_slug" text DEFAULT 'all' NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo_url" text,
	"website" text,
	"rss_url" text,
	"bias_rating" "bias",
	"factuality_rating" "factuality",
	"owner_name" text,
	"owner_type" "owner_type",
	"country" text DEFAULT 'US' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"last_fetched_at" timestamp,
	"last_etag" text,
	"last_modified" text,
	"factuality_score" integer,
	"factuality_tier" text,
	"mbfc_rating" text,
	"mbfc_url" text,
	"newsguard_score" integer,
	"ifcn_signatory" boolean DEFAULT false NOT NULL,
	"has_corrections_policy" boolean DEFAULT false NOT NULL,
	"has_ownership_disclosure" boolean DEFAULT false NOT NULL,
	"has_opinion_labeling" boolean DEFAULT false NOT NULL,
	"has_corrections_archive" boolean DEFAULT false NOT NULL,
	"community_flags" integer DEFAULT 0 NOT NULL,
	"factuality_last_updated" timestamp,
	"reliability_score" integer DEFAULT 60 NOT NULL,
	"uniqueness_score" integer DEFAULT 50 NOT NULL,
	"correction_rate" integer DEFAULT 0 NOT NULL,
	"consistency_score" integer DEFAULT 70 NOT NULL,
	"last_reliability_update" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "publishers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reading_history" (
	"user_id" varchar NOT NULL,
	"article_id" varchar NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" varchar NOT NULL,
	"user_id" varchar,
	"platform" text NOT NULL,
	"shared_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" varchar PRIMARY KEY DEFAULT 'global' NOT NULL,
	"fetch_country" text DEFAULT 'US' NOT NULL,
	"fetch_language" text DEFAULT 'en' NOT NULL,
	"local_news_keywords" text,
	"active_topics" jsonb DEFAULT '[]'::jsonb,
	"use_browser_location" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"followed_topics" jsonb DEFAULT '[]'::jsonb,
	"followed_categories" jsonb DEFAULT '[]'::jsonb,
	"preferred_bias" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'editor' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_embeddings" ADD CONSTRAINT "article_embeddings_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_media" ADD CONSTRAINT "article_media_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_views" ADD CONSTRAINT "article_views_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_views" ADD CONSTRAINT "article_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_publishers_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."publishers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_cluster_id_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."clusters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clusters" ADD CONSTRAINT "clusters_origin_publisher_id_publishers_id_fk" FOREIGN KEY ("origin_publisher_id") REFERENCES "public"."publishers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fetch_queue" ADD CONSTRAINT "fetch_queue_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_events" ADD CONSTRAINT "share_events_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_events" ADD CONSTRAINT "share_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "article_categories_pk" ON "article_categories" USING btree ("article_id","category_id");--> statement-breakpoint
CREATE INDEX "article_categories_category_idx" ON "article_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_ae_article_id" ON "article_embeddings" USING btree ("article_id");--> statement-breakpoint
CREATE UNIQUE INDEX "article_tags_pk" ON "article_tags" USING btree ("article_id","tag_id");--> statement-breakpoint
CREATE INDEX "article_views_article_idx" ON "article_views" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "article_views_viewed_at_idx" ON "article_views" USING btree ("viewed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_source_idx" ON "articles" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "articles_cluster_idx" ON "articles" USING btree ("cluster_id");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_url_idx" ON "articles" USING btree ("url");--> statement-breakpoint
CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "articles_fetched_at_idx" ON "articles" USING btree ("fetched_at");--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "articles_visibility_idx" ON "articles" USING btree ("visibility_state");--> statement-breakpoint
CREATE INDEX "articles_importance_idx" ON "articles" USING btree ("importance_score");--> statement-breakpoint
CREATE INDEX "articles_status_published_at_idx" ON "articles" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "articles_status_visibility_published_idx" ON "articles" USING btree ("status","visibility_state","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_pk" ON "bookmarks" USING btree ("user_id","article_id");--> statement-breakpoint
CREATE INDEX "clusters_importance_idx" ON "clusters" USING btree ("importance_score");--> statement-breakpoint
CREATE INDEX "clusters_trending_idx" ON "clusters" USING btree ("trending_score");--> statement-breakpoint
CREATE INDEX "clusters_blindspot_idx" ON "clusters" USING btree ("blindspot_score");--> statement-breakpoint
CREATE INDEX "clusters_last_updated_idx" ON "clusters" USING btree ("last_updated_at");--> statement-breakpoint
CREATE INDEX "clusters_source_count_idx" ON "clusters" USING btree ("source_count");--> statement-breakpoint
CREATE INDEX "clusters_divergence_idx" ON "clusters" USING btree ("divergence_score");--> statement-breakpoint
CREATE INDEX "clusters_category_idx" ON "clusters" USING btree ("category_slug");--> statement-breakpoint
CREATE INDEX "clusters_importance_first_seen_idx" ON "clusters" USING btree ("importance_score","first_seen_at");--> statement-breakpoint
CREATE INDEX "fetch_queue_status_idx" ON "fetch_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "homepage_cache_category_idx" ON "homepage_cache" USING btree ("category_slug");--> statement-breakpoint
CREATE INDEX "publishers_active_last_fetched_idx" ON "publishers" USING btree ("active","last_fetched_at");--> statement-breakpoint
CREATE INDEX "publishers_fail_count_idx" ON "publishers" USING btree ("fail_count");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_history_pk" ON "reading_history" USING btree ("user_id","article_id");--> statement-breakpoint
CREATE INDEX "reading_history_user_idx" ON "reading_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "share_events_article_idx" ON "share_events" USING btree ("article_id");