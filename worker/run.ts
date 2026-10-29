import pLimit from "p-limit";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobRuns, sources, type JobStep } from "@/lib/db/schema";
import { env, hasEmbeddings, hasLLM, siteUrl } from "@/lib/env";
import { fetchSource } from "@/lib/pipeline/fetch";
import { cleanup, clusterPending, embedPending, rankStories, repairStories } from "@/lib/pipeline/cluster";
import { summarizePending } from "@/lib/pipeline/summarize";
import { seed } from "./seed";

/**
 * One ingestion run (GitHub Actions, every 30 minutes):
 * seed → fetch → embed → repair → cluster → rank → summarize → rank → cleanup → revalidate.
 * Each step is idempotent; anything unfinished is picked up next run.
 */
const BUDGET_MS = 18 * 60 * 1000;
const started = Date.now();
const db = await getDb();
const [run] = await db.insert(jobRuns).values({ kind: "ingest" }).returning();
const steps: JobStep[] = [];

async function step(name: string, fn: () => Promise<{ processed: number; failed?: number; note?: string }>) {
  if (Date.now() - started > BUDGET_MS) {
    steps.push({ name, processed: 0, failed: 0, ms: 0, note: "skipped: time budget" });
    return;
  }
  const t = Date.now();
  try {
    const r = await fn();
    steps.push({ name, processed: r.processed, failed: r.failed ?? 0, ms: Date.now() - t, note: r.note });
  } catch (err) {
    steps.push({ name, processed: 0, failed: 1, ms: Date.now() - t, note: String((err as Error).message).slice(0, 200) });
    console.error(`[${name}]`, err);
  }
  console.log(`✓ ${name}`, steps.at(-1));
  if (run) await db.update(jobRuns).set({ steps }).where(eq(jobRuns.id, run.id));
}

await step("seed", async () => {
  await seed(db);
  return { processed: 1 };
});

await step("fetch", async () => {
  const list = await db.select().from(sources).where(eq(sources.active, true));
  const limit = pLimit(6);
  let inserted = 0;
  let failed = 0;
  await Promise.all(
    list.map((s) =>
      limit(async () => {
        const r = await fetchSource(db, s);
        inserted += r.inserted;
        if (r.status === "error") failed++;
      }),
    ),
  );
  return { processed: inserted, failed, note: `${list.length} sources` };
});

const useEmbeddings = hasEmbeddings();
await step("embed", async () =>
  useEmbeddings ? { processed: await embedPending(db) } : { processed: 0, note: "no embedding provider; lexical clustering" },
);
await step("repair", async () => {
  if (!useEmbeddings) return { processed: 0, note: "needs embeddings" };
  const r = await repairStories(db);
  return { processed: r.detached, note: `${r.checked} stories checked, ${r.detached} reports detached` };
});
await step("cluster", async () => {
  const r = await clusterPending(db, { useEmbeddings });
  return { processed: r.attached + r.created, note: `${r.created} new stories, ${r.attached} attached` };
});
await step("rank", async () => {
  await rankStories(db);
  return { processed: 1 };
});
await step("summarize", async () => {
  if (!hasLLM()) return { processed: 0, note: "no LLM provider configured" };
  const r = await summarizePending(db, 25, started + BUDGET_MS);
  return { processed: r.done, failed: r.failed, note: r.note };
});
await step("rank-final", async () => {
  await rankStories(db);
  return { processed: 1 };
});
await step("cleanup", async () => {
  await cleanup(db);
  return { processed: 1 };
});
await step("revalidate", async () => {
  const secret = env().REVALIDATE_SECRET;
  if (!secret || siteUrl().includes("localhost")) return { processed: 0, note: "skipped" };
  const res = await fetch(`${siteUrl()}/api/revalidate`, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
  return { processed: res.ok ? 1 : 0, failed: res.ok ? 0 : 1, note: `HTTP ${res.status}` };
});

const status = steps.some((s) => s.failed > 0 && s.processed === 0 && s.name !== "revalidate") ? "partial" : "ok";
if (run) await db.update(jobRuns).set({ steps, status, finishedAt: new Date() }).where(eq(jobRuns.id, run.id));
console.log(`Run finished: ${status} in ${Math.round((Date.now() - started) / 1000)}s`);
process.exit(0);
