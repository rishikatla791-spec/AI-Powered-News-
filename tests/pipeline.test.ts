import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

process.env.DATABASE_URL = "pglite://:memory:";
process.env.GEMINI_API_KEY = "test";

// Deterministic fake AI: summaries cite reports 1 and 2; no embeddings (lexical clustering path).
vi.mock("@/lib/ai", async (orig) => {
  const real = await orig<typeof import("@/lib/ai")>();
  return {
    ...real,
    embed: async () => null,
    generateJson: async ({ schema }: { schema: { parse: (x: unknown) => unknown } }) => ({
      model: { provider: "test", model: "fake" },
      data: schema.parse({
        headline: "Monsoon session of Parliament opens with debate on new data law",
        dek: "Opposition and government outline positions on the bill.",
        topic: "india",
        whatWeKnow: [
          { text: "The monsoon session opened on Monday.", citations: [1, 2] },
          { text: "A citation pointing nowhere is dropped.", citations: [99] },
        ],
        differences: [
          {
            point: "Number of bills listed",
            positions: [
              { text: "One report lists 12 bills.", citations: [1] },
              { text: "Another lists 14.", citations: [2] },
            ],
          },
        ],
        entities: [
          { name: "Parliament of India", type: "org" },
          { name: "New Delhi", type: "place" },
        ],
      }),
    }),
  };
});

const { getDb } = await import("@/lib/db");
const schema = await import("@/lib/db/schema");
const { seed } = await import("../worker/seed");
const { storeCandidates, parseFeedItems } = await import("@/lib/pipeline/fetch");
const { clusterPending, rankStories, cleanup, refreshStoryCounts, repairStories } = await import("@/lib/pipeline/cluster");
const { summarizePending } = await import("@/lib/pipeline/summarize");
const { getFrontPage, getStory } = await import("@/lib/services/stories");
const { searchAll } = await import("@/lib/services/search");

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);

describe("ingestion pipeline", () => {
  beforeAll(async () => {
    const db = await getDb();
    await seed(db);
  });

  it("parses feed items, drops stale and short ones", () => {
    const items = parseFeedItems(
      [
        { title: "Fresh headline about the economy", link: "https://a.test/1?utm_source=x", isoDate: hoursAgo(1).toISOString(), contentSnippet: "Body" },
        { title: "Old headline from last week entirely", link: "https://a.test/2", isoDate: hoursAgo(200).toISOString() },
        { title: "Short", link: "https://a.test/3" },
      ] as never,
    );
    expect(items).toHaveLength(1);
  });

  it("stores, dedupes, clusters, summarizes and ranks", async () => {
    const db = await getDb();
    const [hindu] = await db.select().from(schema.sources).where(eq(schema.sources.slug, "the-hindu"));
    const [express] = await db.select().from(schema.sources).where(eq(schema.sources.slug, "indian-express"));
    const [bbc] = await db.select().from(schema.sources).where(eq(schema.sources.slug, "bbc-world"));
    expect(hindu && express && bbc).toBeTruthy();

    const n1 = await storeCandidates(db, hindu!, [
      { url: "https://www.thehindu.com/p1?utm_source=rss", title: "Monsoon session of Parliament begins today amid data bill debate", excerpt: "The session will list 12 bills.", publishedAt: hoursAgo(3) },
      { url: "https://www.thehindu.com/p1", title: "Duplicate by canonical URL should be ignored", excerpt: "", publishedAt: hoursAgo(3) },
    ]);
    expect(n1).toBe(1);
    await storeCandidates(db, express!, [
      { url: "https://indianexpress.com/x", title: "Monsoon session of Parliament begins today amid data bill row", excerpt: "14 bills are listed.", publishedAt: hoursAgo(2) },
    ]);
    await storeCandidates(db, bbc!, [
      { url: "https://bbc.co.uk/y", title: "Volcano erupts in Iceland forcing evacuation of nearby town", excerpt: "Residents left overnight.", publishedAt: hoursAgo(1) },
    ]);

    const c = await clusterPending(db, { useEmbeddings: false });
    expect(c.created).toBe(2);
    expect(c.attached).toBe(1);

    await rankStories(db);
    const s = await summarizePending(db);
    expect(s.done).toBe(1);
    await rankStories(db);

    const front = await getFrontPage();
    expect(front.stories.length).toBe(2);
    const lead = front.stories[0]!;
    expect(lead.outletCount).toBe(2);
    expect(lead.headline).toMatch(/Monsoon session/);

    const story = await getStory(lead.slug);
    expect(story?.summary?.whatWeKnow).toHaveLength(1); // bad citation removed
    expect(story?.summary?.differences).toHaveLength(1);
    expect(story?.coverage).toHaveLength(2);
    expect(story?.entities.map((e) => e.slug)).toContain("parliament-of-india");

    const results = await searchAll("parliament");
    expect(results.stories.length).toBeGreaterThan(0);

    await cleanup(db);
  });

  it("groups by embedding without merging related but different events", async () => {
    const db = await getDb();
    const { EMBED_DIMS } = schema;
    // Unit vectors with known cosine similarities: same event ≈ 0.96, related topic = 0.82.
    const unit = (parts: Record<number, number>) => {
      const v = new Array<number>(EMBED_DIMS).fill(0);
      for (const [i, x] of Object.entries(parts)) v[Number(i)] = x;
      const n = Math.hypot(...v);
      return v.map((x) => x / n);
    };
    const [hindu] = await db.select().from(schema.sources).where(eq(schema.sources.slug, "the-hindu"));
    const [bbc] = await db.select().from(schema.sources).where(eq(schema.sources.slug, "bbc-world"));
    const items = [
      { source: hindu!, url: "https://www.thehindu.com/train-1", title: "High-speed trains collide near Toledo, dozens killed", v: unit({ 10: 1 }) },
      { source: bbc!, url: "https://bbc.co.uk/train-2", title: "Spain rail crash: what we know about the Toledo collision", v: unit({ 10: 1, 11: 0.3 }) },
      { source: bbc!, url: "https://bbc.co.uk/train-3", title: "Drone strike hits crowded railway station in Dnipro", v: unit({ 10: 0.82, 12: Math.sqrt(1 - 0.82 ** 2) }) },
    ];
    for (const [i, it] of items.entries()) {
      await storeCandidates(db, it.source, [{ url: it.url, title: it.title, excerpt: "", publishedAt: hoursAgo(3 - i) }]);
      await db.update(schema.articles).set({ embedding: it.v }).where(eq(schema.articles.url, it.url));
    }

    const c = await clusterPending(db, { useEmbeddings: true });
    expect(c).toEqual({ attached: 1, created: 2 });
    const rows = await db.select({ url: schema.articles.url, storyId: schema.articles.storyId }).from(schema.articles);
    const storyOf = (url: string) => rows.find((r) => r.url === url)?.storyId;
    expect(storyOf(items[0]!.url)).toBe(storyOf(items[1]!.url));
    expect(storyOf(items[2]!.url)).not.toBe(storyOf(items[0]!.url));

    // A story built under the old, looser rule: the off-topic report was attached and summarised with it.
    const crashStory = storyOf(items[0]!.url)!;
    await db.update(schema.articles).set({ storyId: crashStory }).where(eq(schema.articles.url, items[2]!.url));
    await refreshStoryCounts(db, [crashStory]);
    await db
      .update(schema.stories)
      .set({ headline: "Train crashes in Spain and Ukraine", summary: { whatWeKnow: [], differences: [], citedArticleIds: [] } as never })
      .where(eq(schema.stories.id, crashStory));

    const r = await repairStories(db);
    expect(r.detached).toBe(1);
    const [repaired] = await db.select().from(schema.stories).where(eq(schema.stories.id, crashStory));
    expect(repaired?.articleCount).toBe(2);
    expect(repaired?.summary).toBeNull();
    expect(repaired?.headline).toBe(items[0]!.title);
    const [stray] = await db.select({ storyId: schema.articles.storyId }).from(schema.articles).where(eq(schema.articles.url, items[2]!.url));
    expect(stray?.storyId).toBeNull();
    expect(await repairStories(db)).toEqual({ checked: 0, detached: 0 });
  });
});
