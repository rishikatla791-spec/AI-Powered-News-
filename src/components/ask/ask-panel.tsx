"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, ArrowUpRight, Square } from "lucide-react";
import { formatTime, formatDate } from "@/lib/format";

type Source = { n: number; outlet: string; title: string; url: string; publishedAt: string; storySlug: string | null };
type State = "idle" | "retrieving" | "answering" | "done" | "error";

function renderAnswer(text: string, sources: Source[], active: number | null, setActive: (n: number | null) => void) {
  const clean = text.replace(/^\s*INSUFFICIENT:\s*/i, "");
  const parts = clean.split(/(\[\d+\])/g);
  return parts.map((p, i) => {
    const m = /^\[(\d+)\]$/.exec(p);
    if (!m) return <Fragment key={i}>{p}</Fragment>;
    const n = Number(m[1]);
    const src = sources.find((s) => s.n === n);
    if (!src) return null;
    return (
      <motion.a
        key={i}
        href={`#ask-src-${n}`}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onMouseEnter={() => setActive(n)}
        onMouseLeave={() => setActive(null)}
        onFocus={() => setActive(n)}
        onBlur={() => setActive(null)}
        aria-label={`Source ${n}: ${src.outlet}`}
        className={`mx-[1px] inline-grid h-[1.3em] min-w-[1.3em] translate-y-[-0.12em] place-items-center rounded-[4px] px-1 align-middle font-sans text-[0.68em] font-semibold tabular-nums ${
          active === n ? "bg-pencil text-paper" : "bg-pencil-soft text-pencil"
        }`}
      >
        {n}
      </motion.a>
    );
  });
}

export function AskPanel({ initialQuestion, suggestions, enabled }: { initialQuestion: string; suggestions: string[]; enabled: boolean }) {
  const [question, setQuestion] = useState(initialQuestion);
  const [asked, setAsked] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [insufficient, setInsufficient] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (initialQuestion && !started.current && enabled) {
      started.current = true;
      void ask(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ask(q: string) {
    const text = q.trim();
    if (text.length < 6 || state === "retrieving" || state === "answering") return;
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setAsked(text);
    setAnswer("");
    setSources([]);
    setError(null);
    setInsufficient(false);
    setState("retrieving");
    window.history.replaceState(null, "", `/ask?q=${encodeURIComponent(text)}`);
    try {
      const res = await fetch("/api/v1/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text }),
        signal: ctrl.current.signal,
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "The question couldn’t be sent. Check your connection and try again.");
        setState("error");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const ev = /^event: (.+)$/m.exec(chunk)?.[1];
          const data = /^data: (.*)$/m.exec(chunk)?.[1];
          if (!ev || data === undefined) continue;
          const payload = JSON.parse(data);
          if (ev === "sources") {
            setSources(payload);
            setState("answering");
          } else if (ev === "token") setAnswer((a) => a + payload);
          else if (ev === "done") {
            setInsufficient(Boolean(payload.insufficient));
            setState("done");
          } else if (ev === "error") {
            setError(payload.message);
            setState("error");
          }
        }
      }
      setState((s) => (s === "answering" ? "done" : s));
    } catch (e) {
      if ((e as Error).name === "AbortError") setState("done");
      else {
        setError("The connection dropped before the answer finished. Try again.");
        setState("error");
      }
    }
  }

  const busy = state === "retrieving" || state === "answering";
  const cited = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));

  return (
    <div className="mt-10">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
        className="max-w-[760px]"
      >
        <label htmlFor="q" className="sr-only">
          Your question
        </label>
        <div className="relative rounded-xl border border-rule-strong bg-paper-raised transition-shadow focus-within:border-pencil focus-within:shadow-[0_0_0_3px_var(--pencil-soft)]">
          <textarea
            id="q"
            ref={input}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(question);
              }
            }}
            rows={2}
            maxLength={300}
            disabled={!enabled}
            placeholder={enabled ? "What did the RBI decide this week?" : "Ask isn’t switched on for this deployment yet"}
            className="block w-full resize-none bg-transparent px-5 pt-4 pb-14 text-[1.125rem] leading-relaxed outline-none placeholder:text-ink-muted"
          />
          <div className="absolute right-3 bottom-3 left-5 flex items-center justify-between gap-3">
            <span className="meta">{question.length > 240 ? `${300 - question.length} characters left` : "Enter to ask, Shift+Enter for a new line"}</span>
            {busy ? (
              <button type="button" onClick={() => ctrl.current?.abort()} className="btn btn-secondary h-9 gap-2" aria-label="Stop">
                <Square size={13} fill="currentColor" /> Stop
              </button>
            ) : (
              <button type="submit" disabled={!enabled || question.trim().length < 6} className="btn btn-primary h-9 gap-2">
                <ArrowUp size={16} strokeWidth={2} /> Ask
              </button>
            )}
          </div>
          {busy && (
            <motion.span
              className="absolute inset-x-5 bottom-0 h-[2px] origin-left rounded-full bg-pencil"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: state === "retrieving" ? 0.4 : 0.85 }}
              transition={{ duration: state === "retrieving" ? 0.8 : 6, ease: "easeOut" }}
            />
          )}
        </div>
        {enabled && state === "idle" && suggestions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuestion(s);
                  void ask(s);
                }}
                className="rounded-full border border-rule px-3.5 py-1.5 text-left text-[0.875rem] text-ink-2 transition-colors hover:border-ink hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </form>

      <AnimatePresence>
        {state !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 grid gap-12 border-t border-rule pt-10 lg:grid-cols-12"
          >
            <section className="lg:col-span-7" aria-live="polite" aria-busy={busy}>
              <p className="meta">You asked</p>
              <h2 className="hed hed-md mt-1.5">{asked}</h2>
              {state === "retrieving" && <p className="prose-read mt-6 text-ink-muted">Finding reports that cover this…</p>}
              {error && (
                <div className="mt-6 rounded-lg border border-danger/40 px-5 py-4 text-[0.9375rem] text-ink-2">
                  <p>{error}</p>
                </div>
              )}
              {answer && (
                <div className={`mt-6 ${insufficient ? "rounded-lg border border-dashed border-rule-strong p-5" : ""}`}>
                  {insufficient && <p className="mb-2 text-[0.9375rem] font-semibold">The reports don’t answer this</p>}
                  <p className="prose-read whitespace-pre-line">
                    {renderAnswer(answer, sources, active, setActive)}
                    {state === "answering" && <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.2em] animate-pulse bg-pencil" />}
                  </p>
                </div>
              )}
              {state === "done" && !error && (
                <p className="meta mt-8">
                  Written by software from the reports listed. Check the sources before relying on a detail.{" "}
                  <Link href="/methodology#ask" className="text-pencil underline underline-offset-4">How Ask works</Link>
                </p>
              )}
            </section>
            {sources.length > 0 && (
              <aside className="lg:col-span-5" aria-labelledby="ask-sources">
                <h2 id="ask-sources" className="text-[0.9375rem] font-semibold">
                  Reports consulted
                </h2>
                <ol className="mt-4 divide-y divide-rule border-y border-rule">
                  {sources.map((s) => (
                    <li
                      key={s.n}
                      id={`ask-src-${s.n}`}
                      className={`flex gap-3 py-3.5 transition-colors duration-300 ${active === s.n ? "bg-highlight/45" : ""} ${state === "done" && !cited.has(s.n) ? "opacity-55" : ""}`}
                    >
                      <span className="mt-0.5 grid h-5 min-w-5 place-items-center rounded-[4px] bg-pencil-soft px-1 text-[0.6875rem] font-semibold text-pencil tabular-nums">{s.n}</span>
                      <div className="min-w-0">
                        <p className="meta">
                          <span className="font-semibold text-ink-2">{s.outlet}</span> {formatDate(s.publishedAt, { day: "numeric", month: "short" })}, {formatTime(s.publishedAt)}
                        </p>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-[0.9375rem] leading-snug font-medium hover:text-pencil">
                          {s.title}
                          <ArrowUpRight size={13} className="ml-1 inline-block text-ink-muted" />
                        </a>
                        {s.storySlug && (
                          <Link href={`/s/${s.storySlug}`} className="meta mt-1 inline-block hover:text-pencil">
                            Open the full story
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                {state === "done" && <p className="meta mt-3">Faded reports were consulted but not cited.</p>}
              </aside>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
