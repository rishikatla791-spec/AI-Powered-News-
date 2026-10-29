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
const { clusterPending, rankStories, cleanup } = await import("@/lib/pipeline/cluster");
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
});
