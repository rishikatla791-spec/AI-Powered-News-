# Lede

**The news, checked against itself.** Lede reads public news feeds from 40+ outlets, groups reports about the same event into one *story*, and writes a short summary where every line links to the reports it came from. When outlets disagree, it says so.

Live: https://ai-powered-news.vercel.app

| | |
|---|---|
| Front page | Ranked by how many outlets corroborate a story, how fast it is moving and how recent it is |
| Story page | "What we know" with numbered citations, "Where reports differ", a timeline of how coverage spread, every original report |
| Ask the news | Questions answered only from the last 14 days of collected reports, with citations, and an honest "the reports don't cover this" |
| Search | Keyword + semantic (pgvector) hybrid search with Reciprocal Rank Fusion |
| Accounts | Email and password, magic link or Google; follow sections and people, save stories, daily brief email, data export, account deletion |
| Admin | Ingestion runs, feed health, AI usage against the free-tier budget, reported problems |

Running cost: **₹0/month.** Everything runs on free tiers.

---

## Architecture

```
Readers ─▶ Vercel (Next.js 16: pages + /api/v1 route handlers) ─▶ Neon Postgres (pgvector, full-text search)
                                                                         ▲
GitHub Actions cron (every 30 min) ─ worker: fetch → embed → group → rank → summarise → cleanup
                                     │
                                     └─ RSS feeds · Guardian/NYT APIs · Gemini (Groq fallback)
```

- **Frontend**: Next.js 16 App Router, React 19, Tailwind CSS v4, Motion, GSAP ScrollTrigger, Lenis, Radix, cmdk
- **Backend**: Next.js route handlers, Drizzle ORM, PostgreSQL (Neon) with `pgvector`, `pg_trgm` and `tsvector` search
- **Auth**: Better Auth (email + password, magic link, Google)
- **AI**: Gemini free tier (summaries, embeddings, Ask), Groq free tier as fallback; daily request budget enforced in code
- **Worker**: TypeScript CLI run by GitHub Actions; every step is idempotent and resumable
- **Email**: Resend (magic links, daily brief with one-click unsubscribe)

```
src/app/            pages and API routes
src/components/     chrome/, story/, ask/, account/, admin/, motion/, ui/
src/lib/db/         Drizzle schema + Neon / PGlite clients
src/lib/ai/         provider layer, prompts, usage budget
src/lib/pipeline/   fetch, cluster, rank, summarise, cleanup
src/lib/services/   queries used by pages and API
worker/             run.ts (ingest), brief.ts (emails), seed, migrate, sources list
drizzle/            SQL migrations
docs/               decisions, demo script, project spec
```

---

## Run it locally (no accounts needed)

```bash
npm install
cp .env.example .env.local        # uses an embedded Postgres (PGlite) by default
npm run db:migrate
npm run worker:run                 # needs internet; fetches real feeds
npm run dev                        # http://localhost:3000
```

Without AI keys, stories are grouped by headline similarity and shown without summaries. Add a free `GEMINI_API_KEY` to get summaries, semantic grouping, semantic search and Ask. Magic-link emails print to the terminal when `RESEND_API_KEY` is empty.

Checks: `npm run typecheck && npm run lint && npm test && npm run build`. The test suite runs the full pipeline (store → dedupe → group → summarise → rank → search) against an in-memory Postgres.

---

## Deploy (all free)

1. **Database**: create a project at [neon.tech](https://neon.tech) and copy the *pooled* connection string.
2. **AI keys**: get a Gemini key at [aistudio.google.com](https://aistudio.google.com/apikey) and, optionally, a Groq key at [console.groq.com](https://console.groq.com).
3. **Vercel** (project `ai-powered-news`): Settings → Environment Variables:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Neon pooled connection string |
   | `NEXT_PUBLIC_SITE_URL` | `https://ai-powered-news.vercel.app` (or your custom domain) |
   | `BETTER_AUTH_SECRET` | 32+ random characters (`openssl rand -base64 32`) |
   | `ADMIN_EMAILS` | your email (comma-separated for more) |
   | `CONTACT_EMAIL` | public contact address shown on trust pages |
   | `GEMINI_API_KEY`, `GROQ_API_KEY` | from step 2 |
   | `REVALIDATE_SECRET` | any random string (same as in GitHub) |
   | `RESEND_API_KEY`, `EMAIL_FROM` | optional, for sign-in emails and the brief |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional; redirect URI `https://<site>/api/auth/callback/google` |
   | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | optional, shared rate limits |

4. **GitHub** (repo → Settings → Secrets and variables → Actions):
   - Secrets: `DATABASE_URL`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `GUARDIAN_API_KEY` (optional), `NYT_API_KEY` (optional), `REVALIDATE_SECRET`, `RESEND_API_KEY`, `BETTER_AUTH_SECRET`
   - Variables: `NEXT_PUBLIC_SITE_URL`, `GEMINI_MODEL` (`gemini-3.8-flash`), `GROQ_MODEL` (`openai/gpt-oss-120b`), `GEMINI_EMBED_MODEL` (`gemini-embedding-001`), and `BRIEF_ENABLED=true` once email works
5. Run **Actions → Ingest news → Run workflow** once. It applies migrations, seeds sources and fills the first edition. After that it runs every 30 minutes.
   Keep exactly one Vercel project connected to this repo. A second project (for example one imported from the dashboard with the "Other" framework preset) serves only `public/` and answers 404 for every page.
6. Before launch: set your contact address in `public/.well-known/security.txt`, and have someone qualified review `/privacy` and `/terms` (they are marked as drafts). Password reset and magic-link emails need `RESEND_API_KEY`; without it the sign-in page offers email + password only.

**Custom domain**: GitHub Student Developer Pack includes a free domain for a year (Namecheap `.me` or get.tech `.tech`). Add it in Vercel → Domains, then update `NEXT_PUBLIC_SITE_URL`.

---

## Free-tier limits and how Lede stays inside them

- **AI**: `AI_DAILY_REQUEST_BUDGET` (default 400/day). Summaries stop at 75% of the budget so Ask always has capacity; Ask is rate-limited (5/hour anonymous, 25/day signed in). Summaries are cached and only regenerated when a story gains 3+ reports.
- **Database (Neon ~1 GB)**: article bodies dropped after 7 days, embeddings after 21, stories after 45 (bookmarked stories kept).
- **Neon cold starts**: the front page is cached (ISR, 2 min) and revalidated by the worker after each run.

See [docs/decisions.md](docs/decisions.md) for the reasoning behind these choices and [docs/demo-script.md](docs/demo-script.md) for a walkthrough.
