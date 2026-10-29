import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { sources, topics } from "@/lib/db/schema";
import { TOPICS } from "@/lib/topics";
import { SEED_SOURCES } from "./sources";

/** Idempotent: inserts new topics/sources, updates names and URLs of existing ones. */
export async function seed(db: Db) {
  await db
    .insert(topics)
    .values(TOPICS.map((t, i) => ({ slug: t.slug, name: t.name, position: i })))
    .onConflictDoUpdate({ target: topics.slug, set: { name: sql`excluded.name`, position: sql`excluded.position` } });
  await db
    .insert(sources)
    .values(
      SEED_SOURCES.map((s) => ({
        name: s.name,
        slug: s.slug,
        homepage: s.homepage,
        feedUrl: s.feedUrl,
        type: s.type ?? "rss",
        country: s.country,
        defaultTopic: s.topic,
      })),
    )
    .onConflictDoUpdate({
      target: sources.slug,
      set: { name: sql`excluded.name`, homepage: sql`excluded.homepage`, feedUrl: sql`excluded.feed_url`, defaultTopic: sql`excluded.default_topic` },
    });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { getDb } = await import("@/lib/db");
  await seed(await getDb());
  console.log(`Seeded ${TOPICS.length} topics and ${SEED_SOURCES.length} sources.`);
}
