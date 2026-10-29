import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { aiUsage } from "@/lib/db/schema";
import { env } from "@/lib/env";

export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

export function dailyBudget(): number {
  return env().AI_DAILY_REQUEST_BUDGET ?? 400;
}

/** Requests made today across all jobs (UTC day). */
export async function requestsToday(): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ n: sql<number>`coalesce(sum(${aiUsage.requests}), 0)::int` })
    .from(aiUsage)
    .where(sql`${aiUsage.day} = ${todayKey()}`);
  return rows[0]?.n ?? 0;
}

export async function hasBudget(reserve = 0): Promise<boolean> {
  return (await requestsToday()) + reserve < dailyBudget();
}

export async function recordUsage(u: {
  job: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}) {
  try {
    const db = await getDb();
    await db
      .insert(aiUsage)
      .values({
        day: todayKey(),
        job: u.job,
        provider: u.provider,
        model: u.model,
        requests: 1,
        inputTokens: u.inputTokens ?? 0,
        outputTokens: u.outputTokens ?? 0,
      })
      .onConflictDoUpdate({
        target: [aiUsage.day, aiUsage.job, aiUsage.provider, aiUsage.model],
        set: {
          requests: sql`${aiUsage.requests} + 1`,
          inputTokens: sql`${aiUsage.inputTokens} + ${u.inputTokens ?? 0}`,
          outputTokens: sql`${aiUsage.outputTokens} + ${u.outputTokens ?? 0}`,
        },
      });
  } catch (err) {
    console.warn("[ai] could not record usage", err);
  }
}
