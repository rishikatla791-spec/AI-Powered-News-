import type { Metadata } from "next";
import { desc, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { entities, stories, storyEntities } from "@/lib/db/schema";
import { hasLLM } from "@/lib/env";
import { load } from "@/lib/services/safe";
import { AskPanel } from "@/components/ask/ask-panel";

export const metadata: Metadata = {
  title: "Ask the news",
  description: "Ask a question about the past two weeks of reporting and get a short answer that cites its sources.",
};
export const revalidate = 600;

/** Suggestions come from what is actually in the news right now. */
async function suggestions(): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ name: entities.name, importance: stories.importance })
    .from(storyEntities)
    .innerJoin(entities, eq(entities.id, storyEntities.entityId))
    .innerJoin(stories, eq(stories.id, storyEntities.storyId))
    .where(gt(stories.lastUpdatedAt, sql`now() - interval '36 hours'`))
    .orderBy(desc(stories.importance))
    .limit(12);
  const names = [...new Set(rows.map((r) => r.name))].slice(0, 3);
  const forms = ["What happened with {x} this week?", "What do reports say about {x}?", "What’s the latest on {x}?"];
  return names.map((n, i) => forms[i % forms.length]!.replace("{x}", n));
}

export default async function AskPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const s = await load(suggestions);
  return (
    <div className="shell pt-10 md:pt-14">
      <div className="max-w-[760px]">
        <h1 className="hed hed-xl">Ask the news</h1>
        <p className="dek mt-4 max-w-[56ch]">
          Answers are written only from reports Lede has collected in the last 14 days, with a number after each sentence linking to
          its source. If the reports don’t cover your question, it says so.
        </p>
      </div>
      <AskPanel initialQuestion={q ?? ""} suggestions={s.ok ? s.data : []} enabled={hasLLM()} />
    </div>
  );
}
