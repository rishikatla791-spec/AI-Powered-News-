import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { searchAll } from "@/lib/services/search";
import { load } from "@/lib/services/safe";
import { TOPICS, isTopic } from "@/lib/topics";
import { StandardStory } from "@/components/story/story-block";
import { ErrorNotice, SetupNotice } from "@/components/ui/notice";

export const metadata: Metadata = { title: "Search", description: "Search stories, people and places across the last 30 days of reporting." };

type Props = { searchParams: Promise<{ q?: string; topic?: string; days?: string }> };

const RANGES = [
  { v: "1", label: "24 hours" },
  { v: "7", label: "7 days" },
  { v: "30", label: "30 days" },
];

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const topic = sp.topic && isTopic(sp.topic) ? sp.topic : undefined;
  const days = ["1", "7", "30"].includes(sp.days ?? "") ? sp.days! : "30";
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { q, topic, days, ...patch };
    for (const [k, v] of Object.entries(next)) if (v && !(k === "days" && v === "30")) p.set(k, v);
    return `/search?${p.toString()}`;
  };

  const res = q.length >= 2 ? await load(() => searchAll(q, { topic, days: Number(days) })) : null;
  if (res && !res.ok) return res.reason === "unconfigured" ? <SetupNotice /> : <ErrorNotice what="search results" />;
  const data = res?.ok ? res.data : null;

  return (
    <div className="shell pt-10 md:pt-14">
      <h1 className="hed hed-xl">Search</h1>
      <form action="/search" className="mt-6 flex max-w-[720px] gap-2" role="search">
        <label className="relative flex-1">
          <span className="sr-only">Search stories</span>
          <Search size={18} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted" />
          <input name="q" defaultValue={q} placeholder="A person, place or event" className="field h-12 pl-11 text-[1.0625rem]" autoFocus={!q} />
        </label>
        {topic && <input type="hidden" name="topic" value={topic} />}
        {days !== "30" && <input type="hidden" name="days" value={days} />}
        <button className="btn btn-primary h-12 px-5">Search</button>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.875rem]">
        <div className="flex flex-wrap gap-1.5" aria-label="Section">
          <Link href={href({ topic: undefined })} className={chip(!topic)} aria-current={!topic ? "true" : undefined}>
            All sections
          </Link>
          {TOPICS.map((t) => (
            <Link key={t.slug} href={href({ topic: t.slug })} className={chip(topic === t.slug)} aria-current={topic === t.slug ? "true" : undefined}>
              {t.name}
            </Link>
          ))}
        </div>
        <div className="flex gap-1.5" aria-label="Time range">
          {RANGES.map((r) => (
            <Link key={r.v} href={href({ days: r.v })} className={chip(days === r.v)} aria-current={days === r.v ? "true" : undefined}>
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {!q && <p className="prose-read mt-14 max-w-[56ch]">Search covers the last 30 days. It matches words and, when available, meaning, so “fuel prices” also finds stories about petrol and diesel rates.</p>}
      {q.length === 1 && <p className="prose-read mt-14">Type at least two characters.</p>}

      {data && (
        <div className="mt-10 grid gap-12 lg:grid-cols-12">
          <section aria-labelledby="results" className="lg:col-span-8">
            <h2 id="results" className="meta">
              {data.stories.length === 0
                ? `No stories match “${q}”`
                : `${data.stories.length} ${data.stories.length === 1 ? "story" : "stories"} for “${q}”${data.mode === "hybrid" ? ", by words and meaning" : ""}`}
            </h2>
            {data.stories.length === 0 ? (
              <div className="prose-read mt-6 space-y-3">
                <p>Try fewer or different words, widen the time range, or <Link href={`/ask?q=${encodeURIComponent(q)}`} className="text-pencil underline underline-offset-4">ask the question in plain language</Link>.</p>
              </div>
            ) : (
              <ol className="mt-2 divide-y divide-rule">
                {data.stories.map((s) => (
                  <li key={s.id} className="py-7">
                    <StandardStory story={s} withImage={Boolean(s.leadImageUrl)} showTopic />
                  </li>
                ))}
              </ol>
            )}
          </section>
          {data.entities.length > 0 && (
            <aside className="lg:col-span-4" aria-labelledby="people">
              <h2 id="people" className="text-[0.9375rem] font-semibold">People, organisations and places</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {data.entities.map((e) => (
                  <li key={e.slug}>
                    <Link href={`/e/${e.slug}`} className="inline-flex h-9 items-center rounded-full border border-rule-strong px-4 text-[0.9375rem] text-ink-2 hover:border-ink hover:text-ink">
                      {e.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

const chip = (on: boolean) =>
  `inline-flex h-8 items-center rounded-full px-3 transition-colors ${on ? "bg-ink text-paper" : "border border-rule text-ink-muted hover:border-rule-strong hover:text-ink"}`;
