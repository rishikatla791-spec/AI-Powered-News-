import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { aiUsage, flags, jobRuns, stories } from "@/lib/db/schema";
import { getLiveStats, getSourcesWithHealth } from "@/lib/services/stories";
import { load } from "@/lib/services/safe";
import { dailyBudget, todayKey } from "@/lib/ai/usage";
import { formatDateTime, timeAgo } from "@/lib/format";
import { Wordmark } from "@/components/brand/wordmark";
import { FlagActions, SourceToggle } from "@/components/admin/admin-actions";
import { ErrorNotice } from "@/components/ui/notice";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

async function data() {
  const db = await getDb();
  const [runs, usage, openFlags, sources, stats, usage7] = await Promise.all([
    db.select().from(jobRuns).orderBy(desc(jobRuns.startedAt)).limit(12),
    db.select().from(aiUsage).where(eq(aiUsage.day, todayKey())),
    db
      .select({ id: flags.id, reason: flags.reason, note: flags.note, at: flags.at, slug: stories.slug, headline: stories.headline })
      .from(flags)
      .innerJoin(stories, eq(stories.id, flags.storyId))
      .where(eq(flags.status, "open"))
      .orderBy(desc(flags.at))
      .limit(30),
    getSourcesWithHealth(),
    getLiveStats(),
    db
      .select({ day: aiUsage.day, requests: sql<number>`sum(${aiUsage.requests})::int` })
      .from(aiUsage)
      .where(sql`${aiUsage.day} >= to_char(now() - interval '6 days', 'YYYY-MM-DD')`)
      .groupBy(aiUsage.day)
      .orderBy(aiUsage.day),
  ]);
  const [storyCount] = await db.select({ n: count() }).from(stories).where(and(sql`${stories.summary} IS NOT NULL`, sql`${stories.lastUpdatedAt} > now() - interval '24 hours'`));
  return { runs, usage, openFlags, sources, stats, usage7, summarized24h: storyCount?.n ?? 0 };
}

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user?.isAdmin) notFound();
  const res = await load(data);
  if (!res.ok) return <ErrorNotice what="the admin console" />;
  const d = res.data;
  const used = d.usage.reduce((s, u) => s + u.requests, 0);
  const budget = dailyBudget();
  const failing = d.sources.filter((s) => s.lastStatus === "error");
  const maxDay = Math.max(budget, ...d.usage7.map((u) => u.requests));

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule">
        <div className="shell flex h-16 items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <Wordmark compact />
            <span className="text-[0.9375rem] text-ink-muted">Admin</span>
          </Link>
          <Link href="/" className="text-[0.9375rem] text-ink-muted hover:text-ink">Back to the site</Link>
        </div>
      </header>
      <div className="shell space-y-14 py-10">
        <section aria-label="Today" className="grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "Reports in the last 24 hours", v: d.stats.articles24h.toLocaleString("en-IN"), sub: `from ${d.stats.outlets24h} outlets` },
            { k: "Multi-outlet stories, 24 hours", v: d.stats.multiSourceStories24h.toLocaleString("en-IN"), sub: `${d.summarized24h} summarised` },
            { k: "AI requests today", v: `${used} of ${budget}`, sub: "free-tier budget, resets at 00:00 UTC" },
            { k: "Feeds failing", v: String(failing.length), sub: `of ${d.sources.length} sources` },
          ].map((m) => (
            <div key={m.k} className="bg-paper-raised p-5">
              <p className="text-[0.8125rem] text-ink-muted">{m.k}</p>
              <p className="hed mt-2 text-[2rem] num">{m.v}</p>
              <p className="meta mt-1">{m.sub}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="usage" className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="usage" className="hed hed-md">AI requests, last 7 days</h2>
            <p className="meta mt-1">The dashed line is the daily budget. Summaries stop at 75% so Ask always has capacity.</p>
            <div className="relative mt-6 flex h-40 items-end gap-2 border-b border-rule-strong">
              <div className="absolute inset-x-0 border-t border-dashed border-developing" style={{ bottom: `${(budget / maxDay) * 100}%` }} aria-hidden />
              {d.usage7.map((u) => (
                <div key={u.day} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${u.day}: ${u.requests} requests`}>
                  <span className="meta text-[0.6875rem] num">{u.requests}</span>
                  <div className="w-full rounded-t-[3px] bg-pencil" style={{ height: `${(u.requests / maxDay) * 100}%`, minHeight: 2 }} />
                </div>
              ))}
              {d.usage7.length === 0 && <p className="meta m-auto">No AI requests recorded this week.</p>}
            </div>
          </div>
          <div className="lg:col-span-7">
            <h2 className="hed hed-md">Today by job</h2>
            <table className="mt-4 w-full text-left text-[0.9375rem]">
              <thead><tr className="border-b border-rule-strong text-[0.8125rem] text-ink-muted"><th className="py-2 font-medium">Job</th><th className="py-2 font-medium">Model</th><th className="py-2 text-right font-medium">Requests</th><th className="py-2 text-right font-medium">Tokens in / out</th></tr></thead>
              <tbody>
                {d.usage.map((u) => (
                  <tr key={`${u.job}-${u.model}`} className="border-b border-rule">
                    <td className="py-2">{u.job}</td><td className="py-2 text-ink-2">{u.provider}: {u.model}</td>
                    <td className="py-2 text-right num">{u.requests}</td>
                    <td className="py-2 text-right num text-ink-2">{u.inputTokens.toLocaleString("en-IN")} / {u.outputTokens.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                {d.usage.length === 0 && <tr><td colSpan={4} className="py-4 text-ink-muted">No AI requests yet today.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="runs">
          <h2 id="runs" className="hed hed-md">Ingestion runs</h2>
          <p className="meta mt-1">GitHub Actions starts a run every 30 minutes. Each step resumes where the last run stopped.</p>
          <ol className="mt-5 divide-y divide-rule border-y border-rule">
            {d.runs.map((r) => (
              <li key={r.id} className="grid gap-3 py-4 md:grid-cols-12">
                <div className="md:col-span-3">
                  <p className="font-medium">{formatDateTime(r.startedAt)}</p>
                  <p className={`meta ${r.status === "ok" ? "" : "text-developing"}`}>
                    {r.status === "running" ? "Running" : r.status === "ok" ? "Finished" : "Finished with problems"}
                    {r.finishedAt ? ` in ${Math.round((+r.finishedAt - +r.startedAt) / 1000)}s` : ""}
                  </p>
                </div>
                <ul className="flex flex-wrap gap-2 md:col-span-9">
                  {r.steps.map((s) => (
                    <li key={s.name} title={s.note} className={`rounded-md border px-2.5 py-1 text-[0.8125rem] ${s.failed && !s.processed ? "border-danger/50 text-danger" : "border-rule text-ink-2"}`}>
                      {s.name} <span className="num text-ink-muted">{s.processed}</span>
                      {s.note ? <span className="text-ink-muted">, {s.note}</span> : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {d.runs.length === 0 && <li className="py-4 text-ink-muted">No runs yet. Trigger the “Ingest news” workflow in GitHub Actions.</li>}
          </ol>
        </section>

        <section aria-labelledby="flags">
          <h2 id="flags" className="hed hed-md">Reported problems</h2>
          {d.openFlags.length === 0 ? (
            <p className="mt-3 text-ink-muted">No open reports.</p>
          ) : (
            <ul className="mt-5 divide-y divide-rule border-y border-rule">
              {d.openFlags.map((f) => (
                <li key={f.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <Link href={`/s/${f.slug}`} className="font-medium hover:text-pencil">{f.headline}</Link>
                    <p className="mt-1 text-[0.9375rem] text-ink-2">{f.reason}{f.note ? `: “${f.note}”` : ""}</p>
                    <p className="meta mt-1">{timeAgo(f.at)}</p>
                  </div>
                  <FlagActions id={f.id} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="src">
          <h2 id="src" className="hed hed-md">Sources</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[0.9375rem]">
              <thead><tr className="border-b border-rule-strong text-[0.8125rem] text-ink-muted"><th className="py-2 font-medium">Outlet</th><th className="py-2 font-medium">Last status</th><th className="py-2 font-medium">Checked</th><th className="py-2 text-right font-medium">Failures / checks</th><th className="py-2 text-right font-medium">Reports</th><th className="py-2 text-right font-medium">Active</th></tr></thead>
              <tbody>
                {d.sources.map((s) => (
                  <tr key={s.id} className="border-b border-rule">
                    <td className="py-2 font-medium">{s.name}</td>
                    <td className={`py-2 ${s.lastStatus === "error" ? "text-danger" : "text-ink-2"}`} title={s.lastError ?? undefined}>{s.lastStatus ?? "never"}{s.lastError ? `: ${s.lastError.slice(0, 48)}` : ""}</td>
                    <td className="py-2 text-ink-muted">{s.lastFetchAt ? timeAgo(s.lastFetchAt) : "never"}</td>
                    <td className="py-2 text-right num">{s.failures ?? 0} / {s.fetches ?? 0}</td>
                    <td className="py-2 text-right num">{s.articlesTotal ?? 0}</td>
                    <td className="py-2 text-right"><SourceToggle id={s.id} active={s.active} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
