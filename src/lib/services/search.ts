import { and, cosineDistance, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { articles, entities, sources, stories } from "@/lib/db/schema";
import { embed } from "@/lib/ai";
import { hasEmbeddings } from "@/lib/env";
import { getStoriesByIds, type StoryCard } from "./stories";

const K = 60; // Reciprocal Rank Fusion constant

function rrf(lists: string[][]): string[] {
  const score = new Map<string, number>();
  for (const list of lists) list.forEach((id, i) => score.set(id, (score.get(id) ?? 0) + 1 / (K + i + 1)));
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

async function queryVector(q: string): Promise<number[] | null> {
  if (!hasEmbeddings()) return null;
  try {
    return (await embed([q], "RETRIEVAL_QUERY", "search"))?.[0] ?? null;
  } catch {
    return null;
  }
}

export type SearchFilters = { topic?: string; days?: number; semantic?: boolean };

export async function searchAll(q: string, filters: SearchFilters = {}) {
  const query = q.trim().slice(0, 200);
  if (query.length < 2) return { stories: [] as StoryCard[], entities: [], mode: "keyword" as const };
  const db = await getDb();
  const days = filters.days ?? 30;
  const tsq = sql`websearch_to_tsquery('english', ${query})`;
  const windowCond = gt(stories.lastUpdatedAt, sql`now() - make_interval(days => ${days})`);
  const topicCond = filters.topic ? eq(stories.topicSlug, filters.topic) : undefined;

  const keywordStories = await db
    .select({ id: stories.id })
    .from(stories)
    .where(and(sql`${stories.searchTsv} @@ ${tsq}`, windowCond, topicCond))
    .orderBy(desc(sql`ts_rank(${stories.searchTsv}, ${tsq})`))
    .limit(40);

  // Stories whose underlying articles match, for terms that only appear in coverage.
  const viaArticles = await db
    .selectDistinct({ id: stories.id, rank: sql<number>`max(ts_rank(${articles.searchTsv}, ${tsq}))`.as("rank") })
    .from(articles)
    .innerJoin(stories, eq(stories.id, articles.storyId))
    .where(and(sql`${articles.searchTsv} @@ ${tsq}`, windowCond, topicCond))
    .groupBy(stories.id)
    .orderBy(desc(sql`rank`))
    .limit(40);

  const lists = [keywordStories.map((r) => r.id), viaArticles.map((r) => r.id)];
  let mode: "keyword" | "hybrid" = "keyword";

  if (filters.semantic !== false) {
    const v = await queryVector(query);
    if (v) {
      const distance = cosineDistance(stories.centroid, v);
      const semantic = await db
        .select({ id: stories.id, distance })
        .from(stories)
        .where(and(isNotNull(stories.centroid), windowCond, topicCond))
        .orderBy(distance)
        .limit(30);
      lists.push(semantic.filter((r) => 1 - Number(r.distance) > 0.55).map((r) => r.id));
      mode = "hybrid";
    }
  }

  const ids = rrf(lists).slice(0, 30);
  const ents = await db
    .select({ slug: entities.slug, name: entities.name, type: entities.type })
    .from(entities)
    .where(sql`${entities.name} % ${query} OR ${entities.name} ILIKE ${`%${query}%`}`)
    .orderBy(desc(sql`similarity(${entities.name}, ${query})`))
    .limit(6);

  return { stories: await getStoriesByIds(ids), entities: ents, mode };
}

export type Evidence = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  url: string;
  publishedAt: Date;
  outlet: string;
  storySlug: string | null;
};

/** Retrieve evidence for Ask: hybrid over articles from the last 14 days. */
export async function retrieveEvidence(question: string, limit = 12): Promise<Evidence[]> {
  const db = await getDb();
  const cols = {
    id: articles.id,
    title: articles.title,
    excerpt: articles.excerpt,
    content: articles.content,
    url: articles.url,
    publishedAt: articles.publishedAt,
    outlet: sources.name,
    storySlug: stories.slug,
  };
  const recent = gt(articles.publishedAt, sql`now() - interval '14 days'`);
  const tsq = sql`websearch_to_tsquery('english', ${question})`;
  // OR the terms so natural-language questions still match.
  const orq = sql`to_tsquery('english', array_to_string(tsvector_to_array(to_tsvector('english', ${question})), ' | '))`;

  const keyword = await db
    .select(cols)
    .from(articles)
    .innerJoin(sources, eq(sources.id, articles.sourceId))
    .leftJoin(stories, eq(stories.id, articles.storyId))
    .where(and(recent, sql`(${articles.searchTsv} @@ ${tsq} OR ${articles.searchTsv} @@ ${orq})`))
    .orderBy(desc(sql`ts_rank(${articles.searchTsv}, ${orq})`))
    .limit(limit * 2);

  const lists = [keyword.map((r) => r.id)];
  const byId = new Map<string, Evidence>(keyword.map((r) => [r.id, r]));

  const v = await queryVector(question);
  if (v) {
    const distance = cosineDistance(articles.embedding, v);
    const semantic = await db
      .select({ ...cols, distance })
      .from(articles)
      .innerJoin(sources, eq(sources.id, articles.sourceId))
      .leftJoin(stories, eq(stories.id, articles.storyId))
      .where(and(recent, isNotNull(articles.embedding)))
      .orderBy(distance)
      .limit(limit * 2);
    const good = semantic.filter((r) => 1 - Number(r.distance) > 0.5);
    for (const r of good) byId.set(r.id, r);
    lists.push(good.map((r) => r.id));
  }
  return rrf(lists)
    .slice(0, limit)
    .map((id) => byId.get(id))
    .filter((e): e is Evidence => Boolean(e));
}
