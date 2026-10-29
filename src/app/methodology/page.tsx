import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/ui/legal-page";

export const metadata: Metadata = {
  title: "How Lede works",
  description:
    "How Lede collects reports, groups them into stories, writes cited summaries, ranks the front page and answers questions, and where it falls short.",
  alternates: { canonical: "/methodology" },
};

const toc = [
  { id: "sources", label: "Where reports come from" },
  { id: "grouping", label: "Grouping reports into stories" },
  { id: "summaries", label: "How summaries are made" },
  { id: "ranking", label: "Ranking the front page" },
  { id: "ask", label: "Ask the news" },
  { id: "limits", label: "Known limitations" },
  { id: "corrections", label: "Corrections" },
];

function Pipeline() {
  const steps = [
    { label: "Collect", note: "public feeds, every 30 min" },
    { label: "Group", note: "same event, many outlets" },
    { label: "Summarise", note: "every line cited" },
    { label: "Rank", note: "breadth, pace, recency" },
  ];
  return (
    <figure className="not-prose my-10">
      <svg viewBox="0 0 720 120" className="h-auto w-full" role="img" aria-label="Pipeline: collect, group, summarise, rank">
        {steps.map((s, i) => {
          const x = 10 + i * 180;
          return (
            <g key={s.label}>
              <rect x={x} y={20} width={150} height={64} rx={6} fill="var(--paper-raised)" stroke={i === 2 ? "var(--pencil)" : "var(--rule-strong)"} strokeWidth={i === 2 ? 2 : 1} />
              <text x={x + 16} y={50} fill="var(--ink)" style={{ font: "600 17px var(--font-sans)" }}>
                {s.label}
              </text>
              <text x={x + 16} y={71} fill="var(--ink-muted)" style={{ font: "400 12px var(--font-sans)" }}>
                {s.note}
              </text>
              {i < steps.length - 1 && (
                <path d={`M${x + 156} 52 h20 m-6 -5 l6 5 l-6 5`} fill="none" stroke="var(--ink-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              )}
            </g>
          );
        })}
        <path d="M352 100 C 380 96, 420 95, 456 99" fill="none" stroke="var(--pencil)" strokeWidth={2.4} strokeLinecap="round" />
      </svg>
      <figcaption className="meta mt-2">Each run repeats these steps. Anything unfinished is picked up on the next run.</figcaption>
    </figure>
  );
}

export default function MethodologyPage() {
  return (
    <LegalPage
      title="How Lede works"
      intro="Lede is software that reads public news feeds, notices when many outlets report the same event, and writes a short summary in which every line points back to the reports it came from. This page explains each step and its limits."
      toc={toc}
    >
      <Pipeline />

      <h2 id="sources">Where reports come from</h2>
      <p>
        Lede checks public RSS feeds from about forty outlets, plus The Guardian and New York Times APIs when keys are configured,
        every 30 minutes. Requests identify Lede by name and use the feed&rsquo;s caching headers, so unchanged feeds are not
        downloaded again.
      </p>
      <p>
        For each report we store the headline, byline, a short excerpt, the link and the image address the publisher supplies. We
        never republish article text: every story links to the original report. The Guardian&rsquo;s API provides some body text,
        which is used only as input for summaries and deleted after 7 days.
      </p>
      <p>
        The full list of outlets, and whether each feed worked on its last check, is on the <Link href="/sources">sources page</Link>.
        Reports older than 48 hours when first seen are ignored.
      </p>

      <h2 id="grouping">Grouping reports into stories</h2>
      <p>
        Each headline and excerpt is turned into a numerical fingerprint (a 768-dimension text embedding) that places reports about
        similar things close together. A new report joins an existing story when its fingerprint is at least 0.80 similar (cosine
        similarity) to the story&rsquo;s average fingerprint, among stories updated in the last 72 hours. Otherwise it starts a new
        story. Each time a report joins, the story&rsquo;s average is updated.
      </p>
      <p>
        If no embedding service is available, Lede falls back to comparing the letters of headlines (trigram similarity of 0.5 or
        more). This is stricter and produces more small stories, but rarely merges unrelated events.
      </p>

      <h2 id="summaries">How summaries are made</h2>
      <ul>
        <li>A story gets a summary only once at least two different outlets have reported it. Single-source reports are shown as they are, under Just in.</li>
        <li>Up to 10 reports are used: one from each outlet first, then further reports, in the order they were published.</li>
        <li>The language model is instructed to use only those reports, never outside knowledge, and to cite the report numbers behind every line.</li>
        <li>Lines without a valid citation are removed automatically before anything is published.</li>
        <li>When reports disagree on a fact, number or cause, the disagreement is listed under Where reports differ, with each position attributed. If they agree, that section does not appear.</li>
        <li>Headlines for grouped stories are rewritten to be neutral and factual, at most 90 characters, without questions or outlet names.</li>
        <li>Summaries are rewritten when three or more new reports arrive, or 90 minutes after the last summary if any new report has arrived.</li>
        <li>Each summary records the model and prompt version used, and the time it was written, which is shown under it.</li>
      </ul>
      <p>
        The models are Google Gemini and, as a fallback, models served by Groq, on their free tiers. A daily request budget keeps
        Lede within those limits; a quarter of it is reserved for readers using Ask.
      </p>

      <h2 id="ranking">Ranking the front page</h2>
      <p>The front page is ordered by an importance score, recalculated on every run:</p>
      <p>
        <code>importance = (3 × ln(1 + outlets) + ln(1 + reports) + 0.4 × reports in the last 3 hours + 0.5 if summarised) × e<sup>−hours since last report / 18</sup></code>
      </p>
      <p>
        In words: the number of different outlets counts most, fresh activity adds to it, and every story fades with an 18-hour time
        constant unless new reports keep arriving. A story is marked Developing when it was first seen within the last 24 hours, has
        at least two outlets, and received a new report in the last 3 hours.
      </p>
      <p>
        The lead story is the highest-ranked story reported by more than one outlet, preferring one with an image. Nobody pays for or
        hand-picks placement.
      </p>

      <h2 id="ask">Ask the news</h2>
      <p>
        Questions are answered only from reports Lede has collected in the last 14 days. The question is matched against those reports
        by keywords and by meaning, the best 12 are given to the model, and the answer must cite them. If the reports don&rsquo;t
        cover the question, Ask says so instead of guessing. Questions asked while signed out are not stored.
      </p>

      <h2 id="limits">Known limitations</h2>
      <ul>
        <li>Grouping can occasionally put reports about two related events in one story, or split one event into two stories.</li>
        <li>Language models can misstate a detail even when citing a report. Citations are there so you can check.</li>
        <li>Feeds break or change without notice. A broken feed is visible on the sources page until it is fixed.</li>
        <li>Coverage is English-language only, and the outlet list is weighted towards India, the UK and the US.</li>
        <li>Free-tier limits mean new summaries or Ask can pause for the rest of a day.</li>
        <li>Outlet count measures how widely something was reported, not whether it is true.</li>
      </ul>

      <h2 id="corrections">Corrections</h2>
      <p>
        Every story has a Report a problem button. Reports go to an editor, who can correct a summary, move reports between stories,
        or remove a story. You can also write to us through the <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
