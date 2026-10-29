# Decisions

A log of choices that shaped the build, and why. Newest last.

## Stack

- **Next.js 16 instead of 15.** 16 was the current stable release when building. App Router conventions are the same; `params`/`searchParams` are async.
- **One Next.js app instead of a Turborepo monorepo.** The Vercel project deploys from the repo root with zero configuration, and the worker imports the same `src/lib` code through the `@/` alias (run with `tsx`). Business logic still lives in framework-free modules (`src/lib/services`, `src/lib/pipeline`), so it can move to a separate Fastify/Express service later.
- **Better Auth instead of Auth.js.** Auth.js v5 is still in beta; Better Auth is stable, has a Drizzle adapter and a magic-link plugin, and works with Neon's HTTP driver (`transaction: false`).
- **PostgreSQL (Neon) instead of MongoDB.** Relational data (stories ↔ articles ↔ entities ↔ readers), real joins, built-in full-text search, and `pgvector` in the same free database (1 GB free vs 512 MB).
- **PGlite for local development and tests.** An embedded Postgres with `pgvector` and `pg_trgm`, so `npm run dev` and `npm test` need no accounts. The data folder lives in `node_modules/.cache` so the Next.js file watcher ignores it.
- **GitHub Actions cron instead of an always-on worker.** Free, observable, and every step is idempotent, so a missed run just means the next one does more.
- **No full-text extraction.** Only headline, byline, excerpt, image URL and link are stored from RSS. Guardian API body text is used only as summary input and deleted after 7 days. This keeps Lede on the right side of publishers' terms and keeps the database small.

## Design

- The spec's first draft proposed cream paper, a red accent, broadsheet hairlines and monospace labels. That combination is a very common AI-generated look, which the brief explicitly ruled out. The direction became **"the editor's desk"**:
  - cool proof-paper white and graphite ink;
  - one accent, the editor's **blue pencil**, used for citations, links and annotations;
  - a **highlighter** yellow that marks the source being checked;
  - narrow heavy **Instrument Sans** headlines (variable width axis at 78) with **Newsreader** for reading text;
  - no monospace, no all-caps labels.
- **Signature element**: the coverage strip, one mark per outlet in the order they reported, with the first in blue pencil. It appears on every story card, and the story page expands it into a timeline of how coverage spread.
- **Motion** has one orchestrated moment per page (the headline rising word by word; the coverage timeline replaying in publication order) plus responses to the reader's actions (citation highlighting, save/follow confirmations, theme circle reveal). Scroll reveals are short and once-only. Everything respects `prefers-reduced-motion` and a manual "Reduce motion" setting.

## Pipeline thresholds

- **Grouping**: cosine similarity ≥ 0.80 against stories updated in the last 72 hours, with a running-mean centroid. Lower values merged different events with shared actors (two separate RBI announcements); higher values split one event across outlets that wrote very different headlines. Without embeddings, trigram similarity ≥ 0.5 on headlines (conservative: more small stories, fewer wrong merges).
- **Summaries only when 2+ outlets report a story.** A single report is shown as-is under "Just in"; summarising one source adds nothing and spends quota.
- **Citations are validated after generation**: citation numbers outside the provided reports are dropped, and bullets left without a valid citation are removed.
- **Ranking**: `(3·ln(1+outlets) + ln(1+reports) + 0.4·reports_in_last_3h + 0.5·has_summary) · e^(−age_hours/18)`.
