import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const EMBED_DIMS = 768;

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const sourceType = pgEnum("source_type", ["rss", "guardian", "nyt"]);
export const storyStatus = pgEnum("story_status", ["developing", "stable"]);
export const entityType = pgEnum("entity_type", ["person", "org", "place", "event"]);
export const followTarget = pgEnum("follow_target", ["topic", "entity", "source"]);
export const flagStatus = pgEnum("flag_status", ["open", "resolved", "dismissed"]);

/* ───────────────────────── News ───────────────────────── */

export const topics = pgTable("topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
});

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  homepage: text("homepage").notNull(),
  feedUrl: text("feed_url").notNull(),
  type: sourceType("type").notNull().default("rss"),
  country: text("country").notNull(),
  language: text("language").notNull().default("en"),
  defaultTopic: text("default_topic"),
  licenseNote: text("license_note").notNull().default("Headline, excerpt and link only."),
  allowExtraction: boolean("allow_extraction").notNull().default(false),
  active: boolean("active").notNull().default(true),
  etag: text("etag"),
  lastModified: text("last_modified"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const sourceHealth = pgTable("source_health", {
  sourceId: uuid("source_id")
    .primaryKey()
    .references(() => sources.id, { onDelete: "cascade" }),
  lastFetchAt: ts("last_fetch_at"),
  lastStatus: text("last_status"),
  lastError: text("last_error"),
  fetches7d: integer("fetches_7d").notNull().default(0),
  failures7d: integer("failures_7d").notNull().default(0),
  articlesTotal: integer("articles_total").notNull().default(0),
});

export const threads = pgTable("threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  startedAt: ts("started_at").notNull().defaultNow(),
  lastUpdatedAt: ts("last_updated_at").notNull().defaultNow(),
});

export type WhatWeKnow = { text: string; citations: number[] };
export type Difference = { point: string; positions: { text: string; citations: number[] }[] };
export type StorySummary = {
  whatWeKnow: WhatWeKnow[];
  differences: Difference[];
  /** article ids in citation order — citation n refers to citedArticleIds[n-1] */
  citedArticleIds: string[];
};

export const stories = pgTable(
  "stories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    headline: text("headline").notNull(),
    dek: text("dek"),
    topicSlug: text("topic_slug").notNull().default("world"),
    status: storyStatus("status").notNull().default("developing"),
    outletCount: integer("outlet_count").notNull().default(1),
    articleCount: integer("article_count").notNull().default(1),
    importance: real("importance").notNull().default(0),
    firstSeenAt: ts("first_seen_at").notNull().defaultNow(),
    lastUpdatedAt: ts("last_updated_at").notNull().defaultNow(),
    threadId: uuid("thread_id").references(() => threads.id, { onDelete: "set null" }),
    leadImageUrl: text("lead_image_url"),
    centroid: vector("centroid", { dimensions: EMBED_DIMS }),
    summary: jsonb("summary").$type<StorySummary>(),
    summaryModel: text("summary_model"),
    promptVersion: text("prompt_version"),
    summaryGeneratedAt: ts("summary_generated_at"),
    summarizedArticleCount: integer("summarized_article_count").notNull().default(0),
    searchTsv: tsvector("search_tsv").generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(headline, '') || ' ' || coalesce(dek, ''))`,
    ),
  },
  (t) => [
    index("stories_updated_idx").on(t.lastUpdatedAt.desc()),
    index("stories_importance_idx").on(t.importance.desc()),
    index("stories_topic_idx").on(t.topicSlug, t.lastUpdatedAt.desc()),
    index("stories_tsv_idx").using("gin", t.searchTsv),
    index("stories_centroid_idx").using("hnsw", t.centroid.op("vector_cosine_ops")),
  ],
);

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    title: text("title").notNull(),
    byline: text("byline"),
    excerpt: text("excerpt"),
    content: text("content"),
    imageUrl: text("image_url"),
    publishedAt: ts("published_at").notNull(),
    fetchedAt: ts("fetched_at").notNull().defaultNow(),
    language: text("language").notNull().default("en"),
    contentHash: text("content_hash").notNull(),
    readingTimeMin: integer("reading_time_min"),
    topicSlug: text("topic_slug"),
    storyId: uuid("story_id").references(() => stories.id, { onDelete: "set null" }),
    embedding: vector("embedding", { dimensions: EMBED_DIMS }),
    attempts: integer("attempts").notNull().default(0),
    searchTsv: tsvector("search_tsv").generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, ''))`,
    ),
  },
  (t) => [
    uniqueIndex("articles_canonical_idx").on(t.canonicalUrl),
    index("articles_published_idx").on(t.publishedAt.desc()),
    index("articles_story_idx").on(t.storyId),
    index("articles_hash_idx").on(t.contentHash),
    index("articles_tsv_idx").using("gin", t.searchTsv),
    index("articles_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export const entities = pgTable(
  "entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    type: entityType("type").notNull(),
    aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
  },
  (t) => [index("entities_name_trgm_idx").using("gin", sql`${t.name} gin_trgm_ops`)],
);

export const storyEntities = pgTable(
  "story_entities",
  {
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.entityId] }), index("story_entities_entity_idx").on(t.entityId)],
);

/* ───────────────────────── Auth (Better Auth) ───────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: ts("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: ts("access_token_expires_at"),
  refreshTokenExpiresAt: ts("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/* ───────────────────────── Reader data ───────────────────────── */

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  briefEnabled: boolean("brief_enabled").notNull().default(false),
  briefHour: integer("brief_hour").notNull().default(7),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  lastBriefSentAt: ts("last_brief_sent_at"),
});

export const follows = pgTable(
  "follows",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: followTarget("target_type").notNull(),
    targetSlug: text("target_slug").notNull(),
    muted: boolean("muted").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.targetType, t.targetSlug] })],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.storyId] })],
);

export const readEvents = pgTable(
  "read_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    at: ts("at").notNull().defaultNow(),
  },
  (t) => [index("read_events_user_idx").on(t.userId, t.at.desc())],
);

export const askLogs = pgTable("ask_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  citations: jsonb("citations").$type<string[]>().notNull().default([]),
  insufficient: boolean("insufficient").notNull().default(false),
  model: text("model"),
  at: ts("at").notNull().defaultNow(),
});

export const flags = pgTable("flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  note: text("note"),
  status: flagStatus("status").notNull().default("open"),
  at: ts("at").notNull().defaultNow(),
});

/* ───────────────────────── Operations ───────────────────────── */

export const aiUsage = pgTable(
  "ai_usage",
  {
    day: text("day").notNull(),
    job: text("job").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    requests: integer("requests").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.job, t.provider, t.model] })],
);

export type JobStep = { name: string; processed: number; failed: number; ms: number; note?: string };

export const jobRuns = pgTable(
  "job_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull().default("ingest"),
    startedAt: ts("started_at").notNull().defaultNow(),
    finishedAt: ts("finished_at"),
    status: text("status").notNull().default("running"),
    steps: jsonb("steps").$type<JobStep[]>().notNull().default([]),
    error: text("error"),
  },
  (t) => [index("job_runs_started_idx").on(t.startedAt.desc())],
);

export type Story = typeof stories.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type Entity = typeof entities.$inferSelect;
