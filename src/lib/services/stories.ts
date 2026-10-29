import { and, asc, count, countDistinct, desc, eq, gt, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  articles,
  entities,
  jobRuns,
  sourceHealth,
  sources,
  stories,
  storyEntities,
  threads,
  type StorySummary,
} from "@/lib/db/schema";

export type StoryCard = {
  id: string;
  slug: string;
  headline: string;
  dek: string | null;
  topicSlug: string;
  status: "developing" | "stable";
  outletCount: number;
  articleCount: number;
  importance: number;
  firstSeenAt: Date;
  lastUpdatedAt: Date;
  leadImageUrl: string | null;
  hasSummary: boolean;
  keyPoint: string | null;
  keyPoints: string[];
  outlets: string[];
};

const cardColumns = {
  id: stories.id,
  slug: stories.slug,
  headline: stories.headline,
  dek: stories.dek,
  topicSlug: stories.topicSlug,
  status: stories.status,
  outletCount: stories.outletCount,
  articleCount: stories.articleCount,
  importance: stories.importance,
  firstSeenAt: stories.firstSeenAt,
  lastUpdatedAt: stories.lastUpdatedAt,
  leadImageUrl: stories.leadImageUrl,
  summary: stories.summary,
};

type CardRow = { [K in keyof typeof cardColumns]: (typeof cardColumns)[K]["_"]["data"] } & { summary: StorySummary | null };

async function withOutlets(rows: CardRow[]): Promise<StoryCard[]> {
  if (rows.length === 0) return [];
  const db = await getDb();
  const outletRows = await db
    .selectDistinctOn([articles.storyId, sources.name], { storyId: articles.storyId, name: sources.name, at: articles.publishedAt })
    .from(articles)
    .innerJoin(sources, eq(sources.id, articles.sourceId))
    .where(inArray(articles.storyId, rows.map((r) => r.id)))
    .orderBy(articles.storyId, sources.name, asc(articles.publishedAt));
  const byStory = new Map<string, { name: string; at: Date }[]>();
  for (const o of outletRows) {
    if (!o.storyId) continue;
    const list = byStory.get(o.storyId) ?? [];
    list.push({ name: o.name, at: o.at });
    byStory.set(o.storyId, list);
  }
  return rows.map(({ summary, ...r }) => ({
    ...r,
    hasSummary: Boolean(summary?.whatWeKnow?.length),
    keyPoint: summary?.whatWeKnow?.[0]?.text ?? null,
    keyPoints: (summary?.whatWeKnow ?? []).map((b) => b.text),
    outlets: (byStory.get(r.id) ?? []).sort((a, b) => a.at.getTime() - b.at.getTime()).map((o) => o.name),
  }));
}

export type Follows = { topics: string[]; entities: string[]; sources: string[]; mutedTopics: string[]; mutedSources: string[] };

export async function getFrontPage(opts: { follows?: Follows; limit?: number } = {}) {
  const db = await getDb();
  const rows = (await db
    .select(cardColumns)
    .from(stories)
    .where(gt(stories.lastUpdatedAt, sql`now() - interval '48 hours'`))
    .orderBy(desc(stories.importance))
    .limit(120)) as CardRow[];

  let list = rows;
  const f = opts.follows;
  if (f) {
    list = rows
      .filter((r) => !f.mutedTopics.includes(r.topicSlug))
      .map((r) => ({ ...r, importance: r.importance * (f.topics.includes(r.topicSlug) ? 1.6 : 1) }))
      .sort((a, b) => b.importance - a.importance);
  }
  const cards = await withOutlets(list.slice(0, opts.limit ?? 60));
  return { stories: cards, stats: await getLiveStats() };
}

export async function getTopicStories(topicSlug: string, limit = 40) {
  const db = await getDb();
  const rows = (await db
    .select(cardColumns)
    .from(stories)
    .where(and(eq(stories.topicSlug, topicSlug), gt(stories.lastUpdatedAt, sql`now() - interval '7 days'`)))
    .orderBy(desc(sql`${stories.importance} + (${stories.outletCount} * 0.05)`), desc(stories.lastUpdatedAt))
    .limit(limit)) as CardRow[];
  return withOutlets(rows);
}

export async function getStoriesByIds(ids: string[]) {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = (await db.select(cardColumns).from(stories).where(inArray(stories.id, ids))) as CardRow[];
  const cards = await withOutlets(rows);
  return ids.map((id) => cards.find((c) => c.id === id)).filter((c): c is StoryCard => Boolean(c));
}

export type CoverageItem = {
  id: string;
  title: string;
  url: string;
  byline: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  publishedAt: Date;
  outlet: string;
  outletSlug: string;
  outletHome: string;
  citation: number | null;
};

export async function getStory(slug: string) {
  const db = await getDb();
  const [story] = await db.select().from(stories).where(eq(stories.slug, slug)).limit(1);
  if (!story) return null;

  const coverageRows = await db
    .select({
      id: articles.id,
      title: articles.title,
      url: articles.url,
      byline: articles.byline,
      excerpt: articles.excerpt,
      imageUrl: articles.imageUrl,
      publishedAt: articles.publishedAt,
      outlet: sources.name,
      outletSlug: sources.slug,
      outletHome: sources.homepage,
    })
    .from(articles)
    .innerJoin(sources, eq(sources.id, articles.sourceId))
    .where(eq(articles.storyId, story.id))
    .orderBy(asc(articles.publishedAt));

  const cited = story.summary?.citedArticleIds ?? [];
  const coverage: CoverageItem[] = coverageRows.map((r) => {
    const i = cited.indexOf(r.id);
    return { ...r, citation: i >= 0 ? i + 1 : null };
  });

  const ents = await db
    .select({ slug: entities.slug, name: entities.name, type: entities.type })
    .from(storyEntities)
    .innerJoin(entities, eq(entities.id, storyEntities.entityId))
    .where(eq(storyEntities.storyId, story.id));

  let thread: { slug: string; title: string; stories: StoryCard[] } | null = null;
  if (story.threadId) {
    const [t] = await db.select().from(threads).where(eq(threads.id, story.threadId));
    const rows = (await db
      .select(cardColumns)
      .from(stories)
      .where(eq(stories.threadId, story.threadId))
      .orderBy(asc(stories.firstSeenAt))
      .limit(30)) as CardRow[];
    if (t) thread = { slug: t.slug, title: t.title, stories: await withOutlets(rows) };
  }

  const related = ents.length
    ? await getRelated(story.id, ents.map((e) => e.slug), story.threadId)
    : [];

  return { ...story, coverage, entities: ents, thread, related };
}

async function getRelated(storyId: string, entitySlugs: string[], threadId: string | null) {
  const db = await getDb();
  const rows = await db
    .select({ id: storyEntities.storyId, shared: count().as("shared") })
    .from(storyEntities)
    .innerJoin(entities, eq(entities.id, storyEntities.entityId))
    .innerJoin(stories, eq(stories.id, storyEntities.storyId))
    .where(
      and(
        inArray(entities.slug, entitySlugs),
        ne(storyEntities.storyId, storyId),
        threadId ? sql`${stories.threadId} IS DISTINCT FROM ${threadId}` : undefined,
        gt(stories.lastUpdatedAt, sql`now() - interval '14 days'`),
      ),
    )
    .groupBy(storyEntities.storyId)
    .orderBy(desc(sql`shared`))
    .limit(4);
  return getStoriesByIds(rows.map((r) => r.id));
}

export async function getEntity(slug: string) {
  const db = await getDb();
  const [entity] = await db.select().from(entities).where(eq(entities.slug, slug)).limit(1);
  if (!entity) return null;
  const rows = await db
    .select({ id: stories.id })
    .from(storyEntities)
    .innerJoin(stories, eq(stories.id, storyEntities.storyId))
    .where(eq(storyEntities.entityId, entity.id))
    .orderBy(desc(stories.lastUpdatedAt))
    .limit(40);
  const cards = await getStoriesByIds(rows.map((r) => r.id));
  return { entity, stories: cards };
}

export async function getThread(slug: string) {
  const db = await getDb();
  const [thread] = await db.select().from(threads).where(eq(threads.slug, slug)).limit(1);
  if (!thread) return null;
  const rows = (await db
    .select(cardColumns)
    .from(stories)
    .where(eq(stories.threadId, thread.id))
    .orderBy(asc(stories.firstSeenAt))) as CardRow[];
  return { thread, stories: await withOutlets(rows) };
}

/** Real, computed numbers only. */
export async function getLiveStats() {
  const db = await getDb();
  const [a] = await db
    .select({ articles: count(), outlets: countDistinct(articles.sourceId) })
    .from(articles)
    .where(gt(articles.fetchedAt, sql`now() - interval '24 hours'`));
  const [s] = await db
    .select({ stories: count() })
    .from(stories)
    .where(and(gt(stories.lastUpdatedAt, sql`now() - interval '24 hours'`), gt(stories.outletCount, 1)));
  const [run] = await db
    .select({ finishedAt: jobRuns.finishedAt })
    .from(jobRuns)
    .where(isNotNull(jobRuns.finishedAt))
    .orderBy(desc(jobRuns.startedAt))
    .limit(1);
  return {
    articles24h: a?.articles ?? 0,
    outlets24h: a?.outlets ?? 0,
    multiSourceStories24h: s?.stories ?? 0,
    lastUpdated: run?.finishedAt ?? null,
  };
}

export async function getSourcesWithHealth() {
  const db = await getDb();
  return db
    .select({
      id: sources.id,
      name: sources.name,
      slug: sources.slug,
      homepage: sources.homepage,
      type: sources.type,
      country: sources.country,
      defaultTopic: sources.defaultTopic,
      active: sources.active,
      lastFetchAt: sourceHealth.lastFetchAt,
      lastStatus: sourceHealth.lastStatus,
      lastError: sourceHealth.lastError,
      fetches: sourceHealth.fetches7d,
      failures: sourceHealth.failures7d,
      articlesTotal: sourceHealth.articlesTotal,
    })
    .from(sources)
    .leftJoin(sourceHealth, eq(sourceHealth.sourceId, sources.id))
    .orderBy(asc(sources.name));
}

export async function getCoverageTimeline(storyId: string) {
  const db = await getDb();
  return db
    .select({
      hour: sql<Date>`date_trunc('hour', ${articles.publishedAt})`.as("hour"),
      n: count(),
    })
    .from(articles)
    .where(eq(articles.storyId, storyId))
    .groupBy(sql`hour`)
    .orderBy(sql`hour`);
}
