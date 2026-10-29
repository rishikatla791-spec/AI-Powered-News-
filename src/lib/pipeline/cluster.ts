import { and, asc, cosineDistance, desc, eq, gt, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { articles, stories } from "@/lib/db/schema";
import { embed } from "@/lib/ai";
import { shortId, slugify } from "@/lib/text";

/** Cosine similarity needed to attach an article to an existing story. Tuned on real feeds; see docs/decisions.md. */
export const EMBED_THRESHOLD = 0.8;
/** Trigram similarity used only when no embedding provider is configured. */
export const LEXICAL_THRESHOLD = 0.5;
const WINDOW_HOURS = 72;

export async function embedPending(db: Db, limit = 300): Promise<number> {
  const pending = await db
    .select({ id: articles.id, title: articles.title, excerpt: articles.excerpt })
    .from(articles)
    .where(and(isNull(articles.embedding), gt(articles.publishedAt, sql`now() - interval '72 hours'`)))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
  if (pending.length === 0) return 0;
  const vectors = await embed(pending.map((a) => `${a.title}. ${(a.excerpt ?? "").slice(0, 500)}`));
  if (!vectors) return 0;
  let n = 0;
  for (let i = 0; i < pending.length; i++) {
    const v = vectors[i];
    const row = pending[i];
    if (!v || !row) continue;
    await db.update(articles).set({ embedding: v }).where(eq(articles.id, row.id));
    n++;
  }
  return n;
}

function mean(a: number[], k: number, b: number[]): number[] {
  const out = a.map((x, i) => (x * k + (b[i] ?? 0)) / (k + 1));
  const n = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map((x) => x / n);
}

export async function clusterPending(db: Db, opts: { useEmbeddings: boolean; limit?: number }): Promise<{ attached: number; created: number }> {
  const pending = await db
    .select()
    .from(articles)
    .where(
      and(
        isNull(articles.storyId),
        lt(articles.attempts, 3),
        gt(articles.publishedAt, sql`now() - interval '72 hours'`),
        opts.useEmbeddings ? isNotNull(articles.embedding) : undefined,
      ),
    )
    .orderBy(asc(articles.publishedAt))
    .limit(opts.limit ?? 500);

  let attached = 0;
  let created = 0;
  const touched = new Set<string>();

  // Counts are refreshed even if the loop dies part-way (e.g. a dropped connection),
  // otherwise attached articles never show up in outlet_count and the story is never summarised.
  try {
    for (const a of pending) {
      let match: { id: string; centroid: number[] | null; articleCount: number } | undefined;

      if (opts.useEmbeddings && a.embedding) {
        const distance = cosineDistance(stories.centroid, a.embedding);
        const [best] = await db
          .select({ id: stories.id, centroid: stories.centroid, articleCount: stories.articleCount, distance })
          .from(stories)
          .where(and(isNotNull(stories.centroid), gt(stories.lastUpdatedAt, sql`now() - make_interval(hours => ${WINDOW_HOURS})`)))
          .orderBy(distance)
          .limit(1);
        if (best && 1 - Number(best.distance) >= EMBED_THRESHOLD) match = best;
      } else {
        const similarity = sql<number>`similarity(${stories.headline}, ${a.title})`;
        const [best] = await db
          .select({ id: stories.id, centroid: stories.centroid, articleCount: stories.articleCount, similarity })
          .from(stories)
          .where(and(gt(stories.lastUpdatedAt, sql`now() - make_interval(hours => ${WINDOW_HOURS})`), sql`${stories.headline} % ${a.title}`))
          .orderBy(desc(similarity))
          .limit(1);
        if (best && Number(best.similarity) >= LEXICAL_THRESHOLD) match = best;
      }

      if (match) {
        await db.update(articles).set({ storyId: match.id }).where(eq(articles.id, a.id));
        if (match.centroid && a.embedding) {
          await db
            .update(stories)
            .set({ centroid: mean(match.centroid, match.articleCount, a.embedding) })
            .where(eq(stories.id, match.id));
        }
        touched.add(match.id);
        attached++;
      } else {
        const [story] = await db
          .insert(stories)
          .values({
            slug: `${slugify(a.title, 60)}-${shortId()}`,
            headline: a.title,
            dek: a.excerpt,
            topicSlug: a.topicSlug ?? "world",
            firstSeenAt: a.publishedAt,
            lastUpdatedAt: a.publishedAt,
            leadImageUrl: a.imageUrl,
            centroid: a.embedding,
          })
          .returning({ id: stories.id });
        if (!story) continue;
        await db.update(articles).set({ storyId: story.id }).where(eq(articles.id, a.id));
        touched.add(story.id);
        created++;
      }
    }
  } finally {
    await refreshStoryCounts(db, [...touched]);
  }
  return { attached, created };
}

export async function refreshStoryCounts(db: Db, ids: string[]) {
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    await db.execute(sql`
      UPDATE stories s SET
        outlet_count = x.outlets,
        article_count = x.n,
        last_updated_at = x.latest,
        first_seen_at = LEAST(s.first_seen_at, x.earliest),
        lead_image_url = COALESCE(s.lead_image_url, x.img)
      FROM (
        SELECT story_id,
               count(DISTINCT source_id)::int AS outlets,
               count(*)::int AS n,
               max(published_at) AS latest,
               min(published_at) AS earliest,
               (array_agg(image_url ORDER BY published_at DESC) FILTER (WHERE image_url IS NOT NULL))[1] AS img
        FROM articles WHERE ${inArray(articles.storyId, batch)}
        GROUP BY story_id
      ) x
      WHERE s.id = x.story_id`);
  }
}

/** Score stories for the front page: breadth of coverage, velocity and recency. */
export async function rankStories(db: Db) {
  await db.execute(sql`
    UPDATE stories s SET
      importance = (
        ln(1 + s.outlet_count) * 3
        + ln(1 + s.article_count)
        + coalesce(r.recent, 0) * 0.4
        + CASE WHEN s.summary IS NOT NULL THEN 0.5 ELSE 0 END
      ) * exp(-extract(epoch FROM (now() - s.last_updated_at)) / 3600 / 18),
      status = CASE
        WHEN coalesce(r.recent, 0) > 0 AND s.first_seen_at > now() - interval '24 hours' AND s.outlet_count > 1
        THEN 'developing'::story_status ELSE 'stable'::story_status END
    FROM (
      SELECT st.id, count(a.id) FILTER (WHERE a.published_at > now() - interval '3 hours')::int AS recent
      FROM stories st LEFT JOIN articles a ON a.story_id = st.id
      WHERE st.last_updated_at > now() - interval '7 days'
      GROUP BY st.id
    ) r
    WHERE s.id = r.id`);
}

/** Retention keeps the free database small. Bookmarked stories are kept. */
export async function cleanup(db: Db) {
  await db.execute(sql`UPDATE articles SET content = NULL WHERE content IS NOT NULL AND published_at < now() - interval '7 days'`);
  await db.execute(sql`UPDATE articles SET embedding = NULL WHERE embedding IS NOT NULL AND published_at < now() - interval '21 days'`);
  await db.execute(sql`DELETE FROM articles WHERE story_id IS NULL AND published_at < now() - interval '14 days'`);
  await db.execute(sql`
    DELETE FROM stories s WHERE s.last_updated_at < now() - interval '45 days'
      AND NOT EXISTS (SELECT 1 FROM bookmarks b WHERE b.story_id = s.id)`);
  await db.execute(sql`DELETE FROM articles WHERE story_id IS NULL AND published_at < now() - interval '45 days'`);
  await db.execute(sql`DELETE FROM read_events WHERE at < now() - interval '90 days'`);
  await db.execute(sql`DELETE FROM job_runs WHERE started_at < now() - interval '14 days'`);
  await db.execute(sql`DELETE FROM ai_usage WHERE day < to_char(now() - interval '60 days', 'YYYY-MM-DD')`);
  // Approximate a rolling 7-day window for feed health counters (48 runs/day).
  await db.execute(sql`UPDATE source_health SET fetches_7d = fetches_7d / 2, failures_7d = failures_7d / 2 WHERE fetches_7d > 336`);
}
