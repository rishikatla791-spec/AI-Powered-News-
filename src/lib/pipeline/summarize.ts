import { and, desc, eq, gte, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { articles, entities, sources, stories, storyEntities, threads, type Story } from "@/lib/db/schema";
import { AiUnavailableError, generateJson } from "@/lib/ai";
import { PROMPT_VERSION, STORY_SYSTEM, sanitizeSummary, storyPrompt, storySummarySchema } from "@/lib/ai/prompts";
import { dailyBudget, requestsToday } from "@/lib/ai/usage";
import { shortId, slugify } from "@/lib/text";

const MAX_ARTICLES = 10;

/** Stories that deserve a (re-)summary, most important first. */
export async function summaryCandidates(db: Db, limit: number): Promise<Story[]> {
  return db
    .select()
    .from(stories)
    .where(
      and(
        gte(stories.outletCount, 2),
        sql`${stories.lastUpdatedAt} > now() - interval '48 hours'`,
        or(
          isNull(stories.summary),
          sql`${stories.articleCount} >= ${stories.summarizedArticleCount} + 3`,
          and(
            sql`${stories.articleCount} > ${stories.summarizedArticleCount}`,
            lt(stories.summaryGeneratedAt, sql`now() - interval '90 minutes'`),
          ),
        ),
      ),
    )
    .orderBy(desc(stories.importance))
    .limit(limit);
}

/** One article per outlet first (newest), then fill with the rest. */
async function pickArticles(db: Db, storyId: string) {
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      content: articles.content,
      publishedAt: articles.publishedAt,
      sourceId: articles.sourceId,
      outlet: sources.name,
    })
    .from(articles)
    .innerJoin(sources, eq(sources.id, articles.sourceId))
    .where(eq(articles.storyId, storyId))
    .orderBy(desc(articles.publishedAt))
    .limit(60);
  const firstPerOutlet: typeof rows = [];
  const rest: typeof rows = [];
  const seen = new Set<string>();
  for (const r of rows) (seen.has(r.sourceId) ? rest : (seen.add(r.sourceId), firstPerOutlet)).push(r);
  return [...firstPerOutlet, ...rest].slice(0, MAX_ARTICLES).sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
}

export async function summarizeStory(db: Db, story: Story): Promise<boolean> {
  const picked = await pickArticles(db, story.id);
  if (picked.length < 2) return false;
  const { data, model } = await generateJson({
    job: "summarize",
    system: STORY_SYSTEM,
    prompt: storyPrompt(picked),
    schema: storySummarySchema,
  });
  const clean = sanitizeSummary(data, picked.length);
  if (clean.whatWeKnow.length === 0) return false;

  await db
    .update(stories)
    .set({
      headline: clean.headline.trim(),
      dek: clean.dek?.trim() || story.dek,
      topicSlug: clean.topic,
      summary: { whatWeKnow: clean.whatWeKnow, differences: clean.differences, citedArticleIds: picked.map((p) => p.id) },
      summaryModel: `${model.provider}:${model.model}`,
      promptVersion: PROMPT_VERSION,
      summaryGeneratedAt: new Date(),
      summarizedArticleCount: story.articleCount,
    })
    .where(eq(stories.id, story.id));

  const entityIds = await upsertEntities(db, clean.entities);
  await db.delete(storyEntities).where(eq(storyEntities.storyId, story.id));
  if (entityIds.length) {
    await db
      .insert(storyEntities)
      .values(entityIds.map((entityId) => ({ storyId: story.id, entityId })))
      .onConflictDoNothing();
    await linkThread(db, story, entityIds);
  }
  return true;
}

async function upsertEntities(db: Db, list: { name: string; type: "person" | "org" | "place" | "event" }[]) {
  const rows = list
    .map((e) => ({ name: e.name.trim(), type: e.type, slug: slugify(e.name, 60) }))
    .filter((e) => e.slug.length >= 2);
  if (!rows.length) return [];
  const unique = [...new Map(rows.map((r) => [r.slug, r])).values()];
  await db.insert(entities).values(unique).onConflictDoNothing({ target: entities.slug });
  const found = await db
    .select({ id: entities.id })
    .from(entities)
    .where(inArray(entities.slug, unique.map((u) => u.slug)));
  return found.map((f) => f.id);
}

/** Attach to a running thread when an earlier story shares at least two entities. */
async function linkThread(db: Db, story: Story, entityIds: string[]) {
  const [candidate] = await db
    .select({
      storyId: storyEntities.storyId,
      threadId: stories.threadId,
      shared: sql<number>`count(*)::int`.as("shared"),
    })
    .from(storyEntities)
    .innerJoin(stories, eq(stories.id, storyEntities.storyId))
    .where(
      and(
        inArray(storyEntities.entityId, entityIds),
        ne(storyEntities.storyId, story.id),
        sql`${stories.firstSeenAt} < ${story.firstSeenAt}::timestamptz - interval '12 hours'`,
        sql`${stories.firstSeenAt} > ${story.firstSeenAt}::timestamptz - interval '21 days'`,
      ),
    )
    .groupBy(storyEntities.storyId, stories.threadId)
    .having(sql`count(*) >= 2`)
    .orderBy(sql`count(*) DESC`)
    .limit(1);
  if (!candidate) return;

  let threadId = candidate.threadId;
  if (!threadId) {
    const shared = await db
      .select({ name: entities.name })
      .from(storyEntities)
      .innerJoin(entities, eq(entities.id, storyEntities.entityId))
      .where(and(eq(storyEntities.storyId, candidate.storyId), inArray(storyEntities.entityId, entityIds)))
      .limit(2);
    const title = shared.map((s) => s.name).join(" and ") || story.headline;
    const [t] = await db
      .insert(threads)
      .values({ slug: `${slugify(title, 50)}-${shortId(4)}`, title })
      .returning({ id: threads.id });
    if (!t) return;
    threadId = t.id;
    await db.update(stories).set({ threadId }).where(eq(stories.id, candidate.storyId));
  }
  await db.update(stories).set({ threadId }).where(eq(stories.id, story.id));
  await db.update(threads).set({ lastUpdatedAt: new Date() }).where(eq(threads.id, threadId));
}

/** `deadline` (epoch ms): stop starting new summaries after it, so the run ends inside its time budget. */
export async function summarizePending(db: Db, perRun = 25, deadline = Infinity): Promise<{ done: number; failed: number; note?: string }> {
  const remaining = dailyBudget() - (await requestsToday());
  // Keep a reserve of the daily budget for readers using Ask.
  const allowance = Math.min(perRun, Math.floor(remaining - dailyBudget() * 0.25));
  if (allowance <= 0) return { done: 0, failed: 0, note: "daily AI budget reserved for Ask" };
  const list = await summaryCandidates(db, allowance);
  let done = 0;
  let failed = 0;
  for (const s of list) {
    if (Date.now() > deadline) return { done, failed, note: `stopped at time budget; ${list.length - done - failed} left for next run` };
    try {
      if (await summarizeStory(db, s)) done++;
      else failed++;
    } catch (err) {
      failed++;
      if (err instanceof AiUnavailableError) return { done, failed, note: err.message };
      console.warn(`[summarize] ${s.slug}:`, (err as Error).message);
    }
  }
  return { done, failed };
}
