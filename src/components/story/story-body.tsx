"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { formatTime, formatDate, hostname } from "@/lib/format";
import type { Difference, WhatWeKnow } from "@/lib/db/schema";
import { CoverageSpread } from "./coverage-spread";
import { scrollToElement } from "@/components/motion/smooth-scroll";

export type CoverageRow = {
  id: string;
  title: string;
  url: string;
  byline: string | null;
  excerpt: string | null;
  publishedAt: string;
  outlet: string;
  citation: number | null;
};

type Ctx = { active: number | null; setActive: (n: number | null) => void; jump: (n: number) => void };
const CitationCtx = createContext<Ctx>({ active: null, setActive: () => {}, jump: () => {} });

function Citation({ n }: { n: number }) {
  const { active, setActive, jump } = useContext(CitationCtx);
  return (
    <button
      type="button"
      onMouseEnter={() => setActive(n)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(n)}
      onBlur={() => setActive(null)}
      onClick={() => jump(n)}
      aria-label={`Source ${n}`}
      className={`mx-[1px] inline-grid h-[1.3em] min-w-[1.3em] translate-y-[-0.12em] place-items-center rounded-[4px] px-1 align-middle font-sans text-[0.68em] font-semibold tabular-nums transition-colors duration-200 ${
        active === n ? "bg-pencil text-paper" : "bg-pencil-soft text-pencil hover:bg-pencil hover:text-paper"
      }`}
    >
      {n}
    </button>
  );
}

function Cited({ text, citations }: { text: string; citations: number[] }) {
  const { active } = useContext(CitationCtx);
  const on = active !== null && citations.includes(active);
  return (
    <>
      <span className="highlighter box-decoration-clone" data-active={on}>
        {text}
      </span>{" "}
      <span className="whitespace-nowrap">
        {citations.map((c) => (
          <Citation key={c} n={c} />
        ))}
      </span>
    </>
  );
}

export function StoryBody({
  whatWeKnow,
  differences,
  coverage,
  summaryMeta,
  outletCount,
}: {
  whatWeKnow: WhatWeKnow[] | null;
  differences: Difference[];
  coverage: CoverageRow[];
  summaryMeta: { generatedAt: string | null; reports: number } | null;
  outletCount: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const jump = useCallback((n: number) => {
    const el = document.getElementById(`source-${n}`);
    if (!el) return;
    setActive(n);
    scrollToElement(el, -120);
    (el.querySelector("a") as HTMLElement | null)?.focus({ preventScroll: true });
  }, []);
  const jumpToArticle = useCallback(
    (id: string) => {
      const el = document.getElementById(`article-${id}`);
      if (el) scrollToElement(el, -120);
    },
    [],
  );

  return (
    <CitationCtx.Provider value={{ active, setActive, jump }}>
      <div className="border-y border-rule py-6">
        <h2 className="text-[0.9375rem] font-semibold">How the story spread</h2>
        <div className="mt-4">
          <CoverageSpread
            reports={coverage.map((c) => ({ id: c.id, outlet: c.outlet, publishedAt: c.publishedAt, title: c.title }))}
            onSelect={jumpToArticle}
          />
        </div>
      </div>

      <div className="grid gap-14 pt-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          {whatWeKnow && whatWeKnow.length > 0 ? (
            <section aria-labelledby="known">
              <h2 id="known" className="hed hed-lg">
                What we know
              </h2>
              <ul className="prose-read mt-6 space-y-5">
                {whatWeKnow.map((b, i) => (
                  <li key={i} className="relative pl-6">
                    <span aria-hidden className="absolute top-[0.72em] left-0 h-[2px] w-3 rounded-full bg-pencil" />
                    <Cited text={b.text} citations={b.citations} />
                  </li>
                ))}
              </ul>
              {summaryMeta && (
                <p className="meta mt-8 max-w-[60ch]">
                  Summary written by software from {summaryMeta.reports} of these reports
                  {summaryMeta.generatedAt ? ` at ${formatTime(summaryMeta.generatedAt)} IST` : ""}. Every line links to the
                  reports it came from; check them before relying on a detail.{" "}
                  <a href="/methodology#summaries" className="text-pencil underline underline-offset-4">
                    How summaries are made
                  </a>
                </p>
              )}
            </section>
          ) : (
            <section aria-labelledby="known" className="rounded-lg border border-dashed border-rule-strong p-6">
              <h2 id="known" className="hed hed-md">
                {outletCount < 2 ? "Waiting for a second source" : "Summary on its way"}
              </h2>
              <p className="prose-read mt-3 text-[1.0625rem]">
                {outletCount < 2
                  ? "Lede only summarises a story once at least two outlets have reported it. Until then, read the original report below."
                  : "This story was grouped recently. A cited summary is written on the next update, usually within 30 minutes."}
              </p>
            </section>
          )}

          {differences.length > 0 && (
            <section aria-labelledby="differ" className="mt-14">
              <h2 id="differ" className="hed hed-lg">
                Where reports differ
              </h2>
              <div className="mt-6 space-y-8">
                {differences.map((d, i) => (
                  <div key={i}>
                    <h3 className="text-[1.0625rem] font-semibold">{d.point}</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {d.positions.map((p, j) => (
                        <div key={j} className="prose-read rounded-md border-l-2 border-rule-strong bg-paper-raised py-3 pr-4 pl-4 text-[1.0313rem]">
                          <Cited text={p.text} citations={p.citations} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside aria-labelledby="coverage" className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <h2 id="coverage" className="hed hed-md">
              Original reporting
            </h2>
            <p className="meta mt-1.5">
              {coverage.length} {coverage.length === 1 ? "report" : "reports"}, oldest first. Numbers match the citations.
            </p>
            <ol className="mt-5 max-h-none divide-y divide-rule border-y border-rule lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto" data-lenis-prevent>
              {coverage.map((c) => (
                <li
                  key={c.id}
                  id={c.citation ? `source-${c.citation}` : `article-${c.id}`}
                  onMouseEnter={() => c.citation && setActive(c.citation)}
                  onMouseLeave={() => setActive(null)}
                  className={`scroll-mt-28 py-4 pr-2 transition-colors duration-300 ${active !== null && c.citation === active ? "bg-highlight/45" : ""}`}
                >
                  <span id={c.citation ? `article-${c.id}` : undefined} />
                  <div className="flex gap-3">
                    <span
                      className={`mt-0.5 grid h-5 min-w-5 shrink-0 place-items-center rounded-[4px] px-1 text-[0.6875rem] font-semibold tabular-nums ${
                        c.citation ? "bg-pencil-soft text-pencil" : "text-ink-muted/50"
                      }`}
                      aria-hidden={!c.citation}
                    >
                      {c.citation ?? "·"}
                    </span>
                    <div className="min-w-0">
                      <p className="meta">
                        <span className="font-semibold text-ink-2">{c.outlet}</span>{" "}
                        {formatDate(c.publishedAt, { day: "numeric", month: "short" })}, {formatTime(c.publishedAt)}
                      </p>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group mt-1 block text-[1rem] leading-snug font-medium text-ink hover:text-pencil"
                      >
                        {c.title}
                        <ArrowUpRight size={14} className="ml-1 inline-block -translate-y-px text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-pencil" />
                        <span className="sr-only"> (opens {hostname(c.url)} in a new tab)</span>
                      </a>
                      {c.byline && <p className="meta mt-1">{c.byline}</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </CitationCtx.Provider>
  );
}
