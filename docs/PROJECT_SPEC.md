# LEDE — AI-Powered News Aggregator
### Complete build specification for Claude

> **Status (29 Oct 2026): built.** The implementation differs from this spec in a few deliberate ways (Next.js 16 single app instead of a monorepo, Better Auth, and a new visual direction, "the editor's desk", replacing §4.1–4.2 and §4.7). Those are recorded in `docs/decisions.md`; where the two disagree, decisions.md wins.

> **Read this whole file before writing any code.** It is the single source of truth for product, design, architecture, and quality bar. When something here conflicts with your defaults, this file wins.

---

## 0. The brief, in one paragraph

Build **Lede** (working name — a journalism term for the opening line of a story), a full-stack, AI-powered news product that ingests articles from hundreds of real sources, groups them into *stories* (one event, many outlets), and gives readers a calm, beautifully typeset way to understand what actually happened — with AI summaries that always cite their sources, a timeline for every developing story, a side-by-side view of how different outlets covered it, and a personal front page shaped by what the reader follows.

**Treat this as a funded, ~$10M product, not a college demo.** That means: production-grade architecture, real data, real error handling, real accessibility, and a design that a senior editorial design team would sign off on. Every screen should feel *made by people who care about news*, not assembled from a template.

---

## 1. Non-negotiable quality rules

Read these before every major UI decision. If a choice violates one, change the choice.

### 1.1 It must never look AI-generated or "vibe-coded"
Banned outright:
- Purple/blue/indigo gradients, gradient text, gradient pill buttons, glowing blobs, "aurora" backgrounds, glassmorphism cards stacked on gradients.
- Vague hero copy ("Revolutionize the way you consume news", "Your AI-powered news companion", "Stay informed like never before").
- Emojis in UI copy, headings, buttons, or toasts. (Zero. Icons only, from one consistent set.)
- Sparkle ✨ icons or "AI" badges on everything. AI is the engine, not the costume. Label AI output plainly once where it matters ("Summary generated from 14 reports").
- Generic 3-column feature grids with an icon + bold title + two lines of gray text.
- Default shadcn look left unstyled, default Tailwind blue, `rounded-full` on every button, Inter for everything.
- Lorem ipsum, placeholder avatars, stock "diverse team smiling at laptop" imagery.
- "Built with AI", "Powered by GPT/Claude" badges in the product chrome. Mention providers only in the Privacy Policy and an About/Methodology page, where they belong.

### 1.2 Honesty and trust
- **No fake reviews, testimonials, user counts, "trusted by 10,000+ readers", star ratings, or logos of companies that don't use us.** If a number appears, it is computed live from the database (e.g., "2,314 articles from 186 sources in the last 24 hours" — real count).
- **No invented bias/reliability scores for outlets.** If we show any outlet metadata (country, ownership type), it comes from a cited, documented dataset listed on the Methodology page — otherwise we don't show it.
- Every AI summary links to the articles it was built from. Every claim in a "What we know" block carries an inline citation marker. If sources disagree, say so.
- Always link out to the original publisher. We show headline, outlet, byline, short excerpt, and our own summary — **never** reproduce full article text from paywalled or copyrighted sources.
- Empty states and errors tell the truth ("We couldn't reach The Guardian's feed in the last 30 minutes. Showing results from 41 other sources.").

### 1.3 Trust infrastructure (must ship)
- Custom domain (placeholder `{{DOMAIN}}`, e.g. `lede.news` / `readlede.com` — check availability) with HTTPS.
- Proper favicon set: `favicon.ico`, `icon.svg`, `apple-touch-icon.png` (180×180), `icon-192.png`, `icon-512.png`, `site.webmanifest`, themed `<meta name="theme-color">` for light and dark.
- Open Graph + Twitter card images, generated per story with `next/og` (headline set in our typeface, outlet count, timestamp).
- `/privacy` — Privacy Policy (what we collect, why, retention, third parties incl. AI provider, cookies, user rights incl. India's DPDP Act 2023 and GDPR basics, contact email).
- `/terms` — Terms & Conditions (acceptable use, content ownership & attribution, AI-output disclaimer, limitation of liability, governing law).
- `/methodology` — how ingestion, clustering, summarization, and ranking work; list of sources; known limitations. This page is a *feature* — judges and users trust products that explain themselves.
- `/about`, `/contact`, cookie consent (only if non-essential cookies are used), `robots.txt`, `sitemap.xml`, `security.txt`.
- Mark these pages as *drafts to be reviewed by the owner*; do not present them as legal advice.

### 1.4 Every element earns its place
Before adding any section, button, or animation, answer: *what does the reader do or understand because of this?* If the answer is "it looks cool", cut it or make it do work.

---

## 2. Product

### 2.1 Who it's for
- **The busy reader** who wants to know what happened today in 3 minutes, without doomscrolling.
- **The curious reader** who wants to see how one event was reported across outlets and how it developed over time.
- **The student/researcher** who wants to ask questions about the news and get answers with sources.

### 2.2 Core concepts
| Concept | Meaning |
|---|---|
| **Article** | One piece from one outlet (ingested from RSS / API). |
| **Story** | A cluster of articles about the same event, built automatically via embeddings. The main unit of the product. |
| **Thread** | A long-running story that spans days/weeks (e.g., an election, a trial). Stories attach to threads → timeline. |
| **Topic** | Broad section (World, India, Business, Technology, Science, Climate, Health, Sport, Culture) plus fine-grained entity tags (people, orgs, places). |
| **Brief** | The personalized daily edition — a short, ranked set of stories with summaries. |

### 2.3 Feature set (in priority order)

**P0 — must ship, this is the demo**
1. **Front page** — editorial, newspaper-grade layout (not a uniform card grid). Lead story large, secondary stories in varied column widths, a "Developing" rail, topic sections below. Layout is generated from story importance (source count × recency × velocity), not hard-coded.
2. **Story page** — the heart of the product:
   - Headline we write (neutral, factual, ≤ 90 chars) + timestamp of last update.
   - **"What we know"** — 3–6 bullet summary, every bullet cited `[1][3]` to source articles.
   - **"Where reports differ"** — when outlets disagree on numbers, causes, or framing, show it explicitly with quotes and links. If they don't differ, this block does not render.
   - **Coverage** — every article in the cluster: outlet, headline, byline, time, excerpt, link out. Sortable by time / outlet. Shows how many outlets and how coverage grew over time (small, honest chart).
   - **Timeline** — if part of a Thread, a vertical scroll-driven timeline of earlier stories.
   - **Key entities** — people/orgs/places mentioned, each linking to an entity page.
   - Reading time for our summary; "Listen" button (TTS) as P1.
3. **Personalization** — follow topics, entities, and outlets; mute topics/outlets. Personal feed ranks by follows + reading history (stored per user, deletable).
4. **Search** — hybrid: keyword (full-text) + semantic (vector) search across stories and articles, with filters (date range, topic, outlet). Instant results with keyboard navigation.
5. **Ask** — "Ask the news": a question box (e.g., *"What changed in the RBI's policy this week?"*). Answers are generated via retrieval over our article index **only**, streamed, with inline citations. If the index lacks evidence, the answer says so. Never answers from model memory alone.
6. **Auth** — email magic link + Google OAuth. Reading is allowed without an account; following, saving, Ask history need an account.
7. **Saved** — bookmark stories; "read later" list.
8. **Trust pages** from §1.3.

**P1 — makes it feel like a real product**
9. **Daily Brief email** — user-chosen time (respect timezone), beautiful responsive email (React Email), one-click unsubscribe.
10. **Entity pages** — `/e/[slug]`: everything recent about a person/org/place, with a timeline.
11. **Listen** — TTS audio of a story summary or the full Brief.
12. **Reader settings** — text size, line height, light/dark/system theme, reduced motion override.
13. **Keyboard-first** — `j/k` next/prev story, `s` save, `/` search, `?` shortcuts sheet, `⌘K` command palette.
14. **PWA** — installable, offline access to saved stories.

**P2 — admin & operations (judges love seeing the engine room)**
15. **Admin console** (`/admin`, role-gated): sources list with live health (last fetch, success rate, article count), add/disable source, re-run clustering, view recent job runs, AI requests/tokens per day vs. free-tier limits, flagged summaries queue.
16. **Feedback on summaries** — "Report an issue with this summary" → goes to the flagged queue.

### 2.4 How to demo it to judges (not a simple flow)
Design so the demo tells a story with depth, not "login → list → click":
1. Land on the front page — the layout itself shows editorial judgement. Scroll; motion reveals sections calmly.
2. Open the lead story → "What we know" with citations → hover a citation, the source card highlights → "Where reports differ" shows a genuine disagreement between outlets.
3. Scroll into the Timeline — scroll-linked progress line shows how the thread developed.
4. `⌘K` → search an entity → entity page.
5. Ask a question → streamed, cited answer; then ask something the index can't support → the product honestly says it doesn't have evidence.
6. Follow two topics → front page re-ranks live.
7. Open `/admin` → live ingestion health, job runs, AI usage vs. free-tier limits. Then `/methodology` to close on trust.

---

## 3. Tech stack

High quality and modern: React/Next.js + Node on the front and back, with **PostgreSQL** as the database (relational data, real joins, built-in full-text search, and `pgvector` for AI embeddings — all in one free database).

### 3.0 Budget rule: ZERO COST (mandatory)
The whole project must run at **₹0/month** on free tiers. Never add a paid service, a service that needs a credit card on file to stay free, or a design that only works on paid tiers. If a free tier's limit is hit, degrade gracefully (fewer summaries, slower refresh) — never upgrade.

| Need | Free choice | Free-tier notes / limits to design around |
|---|---|---|
| Frontend + API | **Vercel Hobby** — Next.js app *and* API as Route Handlers (`app/api/v1/*`) in one deployment | No always-on server needed; keep functions short (< 10s typical); non-commercial use |
| Background jobs | **GitHub Actions scheduled workflows** run the worker script (`pnpm worker:run`) every 30 min | Unlimited minutes on a public repo (2,000 min/month if private); cron can be delayed a few minutes — fine |
| Database + search + vectors | **Neon Postgres (Free)** with `pgvector`, built-in full-text search, `pg_trgm` | ~1 GB storage per project; compute suspends after ~5 min idle and wakes on the next query (first request may take ~0.5–1s — keep the front page cached); monthly compute-hours cap — check current limits on neon.com/pricing |
| Cache / rate limit | **Upstash Redis free** (only for rate limiting + front-page cache) | Command quota per month — no BullMQ, no polling queues |
| LLM (summaries, headlines, Ask) | **Google Gemini API free tier** (Flash models) — **Groq free tier** as fallback | Requests-per-minute/day limits: summarize only the top ~60–100 stories/day, batch, cache by content hash, back off on 429. Free tiers may use prompts to improve products — disclose in Privacy Policy |
| Embeddings | **Gemini embedding model (free tier)** at 768 dims | Embed title + first 500 chars only |
| Email (magic link, Daily Brief) | **Resend free** | Daily/monthly send caps — Daily Brief is opt-in |
| Auth | **Auth.js** + Google OAuth + email magic link | Free |
| Errors | **Sentry Developer (free)** | Low event quota — sample |
| DNS / CDN | **Cloudflare free** | — |
| Domain | **GitHub Student Developer Pack** free 1-year domain (e.g. `.me` via Namecheap or `.tech`), or a free `is-a.dev` subdomain; fallback `*.vercel.app` | Verify current pack offers before choosing |
| News data | RSS feeds + **Guardian Open Platform** + **NYT** API (free keys) | Respect each API's rate limit |
| TTS ("Listen") | **Browser Web Speech API** (client-side) | No server cost |
| CI | GitHub Actions | Free |

Consequences for the rest of this spec (these override §3.3–3.7 and §6 where they differ):
- **No separate API server and no Railway/Render.** The API from §6.3 lives in Next.js Route Handlers. Keep handlers framework-agnostic (`services/` layer) so they could move to Fastify later.
- **No BullMQ / always-on worker.** `apps/worker` is a CLI script run by GitHub Actions that executes the pipeline steps in order (fetch → process → embed → cluster → summarize → rank) with a time budget, records each run in a `job_runs` collection, and resumes next run where it stopped. Steps stay idempotent.
- Admin "queue" view becomes a **job runs** view (status, duration, items processed, errors, AI calls used vs. free-tier quota).
- Track AI **requests and tokens** (not money) in `ai_usage` against free-tier limits.
- Daily Brief emails are sent by a GitHub Actions cron that runs hourly and picks users whose brief time falls in that hour.

### 3.1 Monorepo
- **pnpm workspaces + Turborepo**
- **TypeScript everywhere**, `strict: true`
- Shared packages for types, schemas (Zod), UI, config

### 3.2 Frontend — `apps/web`
- **Next.js 15 (App Router) + React 19**, Server Components by default, streaming, `next/font`, `next/image`, `next/og`
- **Tailwind CSS v4** with a custom token layer (CSS variables) — *not* the default palette
- **Radix UI primitives** (dialog, popover, dropdown, tooltip, tabs) — headless, styled by us. shadcn/ui may be used as a starting point but must be fully restyled to our system.
- **Motion** (`motion/react`, formerly Framer Motion) — component transitions, layout animations, shared-element transitions
- **GSAP + ScrollTrigger** — scroll-linked storytelling (timeline progress, pinned sections). GSAP is free for all use since 2025.
- **Lenis** — smooth scrolling (disabled under `prefers-reduced-motion`)
- **TanStack Query** — client data fetching/caching for interactive parts
- **Zustand** — small client state (reader settings, command palette)
- **cmdk** — command palette
- **Lucide** or **Phosphor** icons (pick one, use only that)
- **Visx** or a small custom SVG chart for coverage charts (no chart-library default look)
- **React Hook Form + Zod** for forms

### 3.3 Backend — Next.js Route Handlers (`apps/web/app/api/v1/*`) + `packages/core`
- **Node.js 22 LTS** runtime on Vercel; business logic in `packages/core/services/*` (plain TypeScript, framework-free) so it can be moved to a Fastify/Express server later without rewrites
- **Neon PostgreSQL (free)** with **Drizzle ORM** (type-safe, SQL-first, lightweight on serverless) and `@neondatabase/serverless` driver; use Neon's pooled connection string from Vercel
  - **Postgres full-text search** (`tsvector` + GIN) for keyword search, **`pgvector`** (HNSW index) for embeddings, **`pg_trgm`** for fuzzy entity search — one database, no extra search or vector service
  - Migrations with `drizzle-kit`; seed script for sources and topics
- **Upstash Redis (free)** — rate limiting (`@upstash/ratelimit`) and short-lived front-page cache only
- **Auth.js (NextAuth v5)** with the Drizzle adapter — Google OAuth + email magic link
- **Zod** validation on every request body/query; OpenAPI spec generated from Zod (`zod-to-openapi`) and served at `/api/v1/docs`
- **Pino** logging, **Sentry** (free tier, sampled)

### 3.4 Worker — `apps/worker` (run by GitHub Actions cron, not a server)
- Single CLI entry `pnpm worker:run` executing pipeline steps in order within a ~20-minute budget; resumable via `job_runs` checkpoints
- **rss-parser** for feeds, **@mozilla/readability + jsdom** for extracting text where the publisher allows it (respect robots.txt; otherwise use RSS description only)
- Polite fetching: per-domain concurrency limits (`p-limit`), `User-Agent` identifying the product with contact URL, ETag/Last-Modified caching
- Secrets stored as GitHub Actions secrets

### 3.5 AI layer — `packages/ai`
- Provider-agnostic interface: `summarize()`, `embed()`, `extractEntities()`, `answer()`, `headline()` — swapping providers is a config change
- **LLM**: **Gemini Flash (free tier)** primary, **Groq free tier** (open models) as fallback on rate limit; optional paid providers (Claude/OpenAI) supported by the interface but **disabled by default**
- **Embeddings**: Gemini embedding model at **768 dims** (keeps the free 1 GB database comfortable)
- Free-tier discipline: summarize only top-ranked stories, one call per story that returns headline + bullets + differences + entities together, batch where possible, exponential backoff on 429, daily request budget enforced in code
- All prompts versioned in code (`packages/ai/prompts/*.ts`), outputs validated with Zod schemas (structured / JSON output)
- Cache every AI result by content hash; never re-summarize unchanged clusters
- Track requests + tokens per job in `ai_usage` vs. free-tier limits (shown in admin)

### 3.6 News sources (real, legal)
- **RSS feeds** from major outlets (The Hindu, Indian Express, BBC, Reuters, AP, Al Jazeera, NPR, The Guardian, Mint, Economic Times, Ars Technica, The Verge, Nature News, etc.) — verify each feed URL works before adding
- **The Guardian Open Platform API** (free key, generous)
- **NYT APIs** (free key) for headlines/metadata
- Optional: GNews / NewsData.io free tiers
- **Avoid NewsAPI.org for production** — its free tier is development-only
- Store `source.license` notes; show only what each source permits

### 3.7 Email, infra, deploy (all free)
- **Resend (free) + React Email** for magic links and the Daily Brief
- **Vercel Hobby** for `apps/web` (UI + API); **GitHub Actions cron** for `apps/worker`; **Neon Postgres free** + **Upstash Redis free**
- **Cloudflare (free)** for DNS on the custom domain (free Student Pack domain or `is-a.dev` subdomain)
- **GitHub Actions** CI: typecheck, lint, test, build on every PR
- Local dev: `docker-compose` with the `pgvector/pgvector:pg17` Postgres image + Redis — no cloud usage while developing
- Environment config via `.env` + Zod-validated `env.ts` in each app

### 3.8 Quality tooling
- ESLint (flat config) + Prettier, `lint-staged` + Husky
- **Vitest** (unit), **Playwright** (e2e for the demo flow), **axe-core** accessibility checks in Playwright
- Lighthouse CI budget: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95 on the front page and a story page

---

## 4. Design system — "Newsprint, refined"

The design should feel like a serious modern publication — closer to the craft of a great print newspaper's digital edition than to a SaaS dashboard. Calm, typographic, confident, warm.

### 4.1 Typography (the single most important design decision)
| Role | Typeface | Notes |
|---|---|---|
| Headlines / display | **Newsreader** (Google Fonts, variable, has optical sizes) | Use opsz axis: large opsz for big headlines, tight tracking (-0.02em) at display sizes |
| Long reading (summaries) | **Newsreader** text optical size, or **Source Serif 4** | 18–20px, line-height 1.6, max 68ch |
| UI, labels, navigation | **Instrument Sans** or **Public Sans** | Never Inter/Roboto/Poppins/Montserrat |
| Metadata, timestamps, counts | **IBM Plex Mono** or **JetBrains Mono** | Small caps-feel: 12px, uppercase, letter-spacing 0.06em |

- Load with `next/font` (self-hosted, no layout shift), `font-display: swap`, subset Latin (+ Devanagari only if Hindi content is added later).
- Fluid type scale with `clamp()`; ratio ~1.25 on mobile, ~1.333 on desktop. Lead headline can go to ~72–96px on wide screens.
- Use real typographic details: proper quotes (" " ' '), en/em dashes, `font-variant-numeric: tabular-nums` for counts and times, `text-wrap: balance` on headlines, `text-wrap: pretty` on paragraphs, hanging punctuation where supported, drop cap on the story lead paragraph (subtle).

### 4.2 Color
One restrained palette, one accent, used sparingly. Define as CSS variables; light and dark both designed, not inverted.

| Token | Light | Dark |
|---|---|---|
| `--paper` (background) | `#F5F2EB` warm newsprint | `#121110` warm ink-black |
| `--paper-raised` | `#FBF9F4` | `#1A1917` |
| `--ink` (primary text) | `#151412` | `#ECE8DF` |
| `--ink-muted` | `#5B5750` | `#A39E93` |
| `--rule` (hairlines) | `#D9D3C7` | `#2E2C28` |
| `--accent` (one editorial red) | `#C8321E` | `#E5533D` |
| `--accent-ink` (text on accent) | `#FFFFFF` | `#121110` |
| `--live` (developing indicator) | `#B4521A` | `#E07A3A` |
| `--focus` | `#1F5FD1` | `#7AA7FF` (focus rings only) |

- Accent is for: the "Developing" marker, active nav, citation highlights, the primary action. Not for decoration.
- Check every text/background pair for WCAG AA (4.5:1 body, 3:1 large text).
- Images: slightly desaturated treatment by default (`filter: saturate(0.9)`), full color on hover/focus — gives the page a cohesive editorial tone.

### 4.3 Layout & structure
- **12-column grid**, generous gutters, max content width ~1360px; text columns capped at 68ch.
- **Hairline rules** (1px `--rule`) and whitespace separate content — not boxes, not shadows. Cards are rare.
- **Corner radius**: 2–4px on inputs/buttons, 0 on images and editorial blocks. No pill buttons except small tag chips.
- **Shadows**: almost none; one subtle elevation for popovers/dialogs only.
- Front page uses **asymmetric, varied column compositions** (e.g., 7/5, 4/4/4, 8/4 with a rail) chosen by an algorithm from story importance, so the page looks *edited*, not templated.
- Masthead: wordmark + today's date + edition time ("Updated 18:40 IST") in mono. Sticky, compresses on scroll.

### 4.4 Components (all custom-styled)
Masthead, section nav, story block (5 sizes: lead, major, standard, compact, headline-only), developing rail, citation marker + source popover, coverage list, coverage chart, timeline, entity chip, follow button, search overlay, command palette, ask panel with streaming answer, toast, dialog, sheet (mobile), skeletons that match final layout exactly, empty states, error states, reader settings panel, footer (with Privacy, Terms, Methodology, Sources, Contact).

### 4.5 Buttons & controls
- Primary: solid `--ink` background, `--paper` text, 4px radius, 40–44px tall, medium weight sans, no gradient, no glow.
- Secondary: 1px `--ink` border, transparent.
- Tertiary: text with underline offset that animates on hover.
- Every control has visible `:focus-visible` ring, hover, active, disabled, and loading states.

### 4.6 Iconography & imagery
- One icon set, 1.5px stroke, sized to the text it sits next to.
- Article images come from publishers (via `og:image`) with attribution caption; if missing, use a **typographic fallback** (outlet name + topic set in type on a tinted paper block) — never AI-generated stock art.
- Our own illustrations (if any): simple line work in `--ink` only.

### 4.7 Logo & favicon
- Wordmark "Lede" set in Newsreader display, custom-kerned, with a small detail (e.g., the accent-red period: **Lede.**). Export SVG.
- Favicon: the "L." monogram — ink "L" + red dot — crisp at 16px; separate dark-mode version via `media` in `icon.svg`.

---

## 5. Motion & interaction design

Motion should feel like **turning pages of a well-made publication**: quick, purposeful, never bouncy or showy. It explains hierarchy and continuity.

### 5.1 Principles
- Durations: 150–220ms for UI feedback, 300–500ms for section reveals, up to 700ms for page-level transitions. Nothing longer.
- Easing: custom curves — `cubic-bezier(0.22, 1, 0.36, 1)` (out-expo-ish) for entrances, `cubic-bezier(0.65, 0, 0.35, 1)` for movement. No springs with visible overshoot on text.
- Animate `transform` and `opacity` only (GPU-friendly). No layout thrash.
- **`prefers-reduced-motion`**: disable Lenis, parallax, scroll-linked effects; keep only opacity fades ≤ 150ms. Plus a manual toggle in reader settings.
- Target 60fps on a mid-range Android phone; test with CPU throttling 4×.

### 5.2 Specific moments (implement all)
1. **First load**: masthead rule draws left→right (scaleX), wordmark fades in, then the lead headline reveals line-by-line (split by lines, mask + translateY 100%→0, 60ms stagger). Total < 900ms. Only on first visit per session.
2. **Scroll reveals**: story blocks fade + rise 16px as they enter (IntersectionObserver / Motion `whileInView`, once). Images reveal with a clip-path wipe (inset 0 0 100% 0 → 0).
3. **Story open (shared-element transition)**: clicking a story morphs its headline and image into the story page header (View Transitions API in Next.js, with Motion `layoutId` fallback).
4. **Citation hover**: hovering `[3]` highlights the matching source row in the coverage list (accent underline sweep) and shows a popover with outlet + headline + time.
5. **Timeline**: GSAP ScrollTrigger draws the vertical line as you scroll; each event node fills in when reached; the current date pins at the side.
6. **Coverage chart**: bars/area grow in when visible, with numbers counting up (real data only).
7. **Masthead compress**: on scroll down, masthead height shrinks and wordmark scales to ~70%; on scroll up it returns.
8. **Ask streaming**: tokens stream in; citation chips pop in as they're referenced; a thin progress rule under the input while retrieving.
9. **Follow button**: check mark draws in (SVG stroke-dashoffset), count updates with a vertical number roll.
10. **Page transitions**: content cross-fades with a 12px vertical offset; skeletons match the final layout so nothing jumps (CLS < 0.05).
11. **Theme switch**: View Transitions circular reveal from the toggle position.
12. **Micro-details**: link underlines that grow from left on hover; image subtle scale 1.0→1.02 on hover over 600ms; cursor-aware tilt is **not** used (gimmick).

---

## 6. Architecture

```
                ┌────────────────────────────────────────┐
  Readers ───▶  │ Vercel Hobby: apps/web (Next.js 15)    │
                │  pages (SSR/ISR, OG images, Auth.js)   │
                │  /api/v1/* Route Handlers → core/      │──▶ Upstash Redis (rate limit, cache)
                └───────────────────┬────────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │ Neon Postgres (free)│
                         │ FTS + pgvector      │
                         └──────────▲──────────┘
                                    │
                ┌───────────────────┴────────────────────┐
                │ GitHub Actions cron (every 30 min)     │
                │ apps/worker: fetch → extract → dedupe →│
                │ embed → cluster → summarize → rank     │
                │ (+ hourly Daily Brief email run)       │
                └───────────────────┬────────────────────┘
                                    │
            RSS / Guardian / NYT APIs · Gemini (Groq fallback) · Resend
```

### 6.1 Ingestion pipeline (worker steps, run sequentially each cron run)
1. **`fetch-source`** (each run; sources staggered so each is polled every 30–60 min): fetch RSS/API with ETag; collect new items.
2. **`process-article`**: normalize URL (strip tracking params), dedupe by canonical URL + content hash, extract text where allowed, detect language, compute reading time, pull `og:image`.
3. **`embed-article`**: embed `title + first 800 chars`; store vector.
4. **`cluster-article`**: vector search for nearest stories in last 72h; if cosine similarity ≥ threshold (start 0.82, tune) **and** entity overlap passes, attach; else create new story. Periodic **`recluster`** job merges near-duplicate stories.
5. **`summarize-story`**: debounced — runs when a story gains ≥ 2 new articles or 30 min passed. Produces neutral headline, "What we know" bullets with citation indexes, "Where reports differ", entities, topic. Validate against Zod; reject if any bullet lacks a citation.
6. **`thread-link`**: link story to an existing thread if same entities + similarity over longer window.
7. **`rank`**: compute `importance = f(unique_outlets, velocity_last_3h, recency_decay, topic_weight)`; cache front-page layout in Redis.
8. **`send-brief`**: per-user schedule.

All steps: idempotent, retries with exponential backoff, failures recorded in `job_runs` and visible in admin; a failed item is retried on the next run (max 3 times, then marked `failed`).

### 6.2 Data model (PostgreSQL via Drizzle ORM, sketch)
Use `uuid` primary keys (`gen_random_uuid()`), `timestamptz` for all times, enums via `pgEnum`, foreign keys with `ON DELETE` rules, and `jsonb` only for genuinely nested AI output. Schema lives in `packages/db/schema/*.ts`; changes go through `drizzle-kit` migrations committed to the repo.

```sql
sources        (id, name, slug UNIQUE, homepage, feed_url, type ENUM('rss','guardian','nyt'),
                country, language, license_note, active BOOL, created_at)
source_health  (source_id PK→sources, last_fetch_at, last_status, success_rate_7d, articles_24h)
topics         (id, slug UNIQUE, name)
source_topics  (source_id→sources, topic_id→topics, PK(source_id, topic_id))

articles       (id, source_id→sources, url, canonical_url UNIQUE, title, byline, excerpt,
                content NULL /* only if allowed */, image_url, published_at, fetched_at,
                language, content_hash, reading_time_min, story_id NULL→stories,
                embedding VECTOR(768),
                search_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || coalesce(excerpt,''))) STORED)

stories        (id, slug UNIQUE, headline, topic_id→topics, status ENUM('developing','stable'),
                outlet_count, importance REAL, first_seen_at, last_updated_at,
                thread_id NULL→threads, centroid VECTOR(768),
                summary JSONB /* { whatWeKnow:[{text, citations:[articleId]}],
                                   differences:[{point, positions:[{text, citations}]}] } */,
                summary_model, prompt_version, summary_generated_at, search_tsv TSVECTOR)

threads        (id, slug UNIQUE, title, started_at, last_updated_at)
entities       (id, slug UNIQUE, name, type ENUM('person','org','place','event'), aliases TEXT[])
article_entities (article_id→articles, entity_id→entities, PK(both))
story_entities   (story_id→stories, entity_id→entities, PK(both))

users          (id, email UNIQUE, name, image, role ENUM('reader','admin'), created_at)
-- Auth.js tables via @auth/drizzle-adapter: accounts, sessions, verification_tokens
user_settings  (user_id PK→users, theme, text_size, reduced_motion, brief_time, timezone)
follows        (user_id→users, target_type ENUM('topic','entity','source'), target_id, muted BOOL,
                created_at, PK(user_id, target_type, target_id))
bookmarks      (user_id→users, story_id→stories, created_at, PK(user_id, story_id))
read_events    (id, user_id→users, story_id→stories, dwell_ms, at)   -- purged after 90 days
ask_logs       (id, user_id NULL→users, question, answer, citations UUID[], model, tokens, at)
ai_usage       (date, job, provider, model, requests, input_tokens, output_tokens, PK(date, job, provider, model))
job_runs       (id, started_at, finished_at, status, steps JSONB, checkpoint JSONB)
flags          (id, story_id→stories, user_id NULL→users, reason, note, status, at)
```

Indexes:
- B-tree: `articles(published_at DESC)`, `articles(story_id)`, `stories(last_updated_at DESC)`, `stories(importance DESC)`, `articles(content_hash)`
- **Full-text**: GIN on `articles.search_tsv` and `stories.search_tsv`; `pg_trgm` GIN on `entities.name` for fuzzy/typeahead search
- **Vector** (`pgvector`): HNSW with `vector_cosine_ops` on `articles.embedding` and `stories.centroid`
- Hybrid search = full-text rank + vector similarity combined with Reciprocal Rank Fusion in one SQL query

Retention (keeps the free 1 GB comfortable): a cleanup step in the worker deletes `articles.content` after 7 days, articles not attached to a story after 14 days, and stories + their articles after 45 days (unless bookmarked); `VACUUM` is handled by Neon.

### 6.3 API (REST, Next.js Route Handlers under `/api/v1`)
```
GET  /v1/front-page                 → ranked layout (cached 60s)
GET  /v1/stories?topic&cursor       → paginated
GET  /v1/stories/:slug              → full story + coverage
GET  /v1/stories/:slug/timeline
GET  /v1/topics, /v1/topics/:slug
GET  /v1/entities/:slug
GET  /v1/search?q&from&to&topic&source&mode=hybrid
POST /v1/ask                        → SSE stream {token|citation|done}
GET  /v1/me, PATCH /v1/me/settings
POST /v1/me/follows, DELETE /v1/me/follows/:type/:id
GET  /v1/me/feed
GET/POST/DELETE /v1/me/bookmarks
POST /v1/me/export, DELETE /v1/me     → data export & account deletion (privacy)
POST /v1/flags
GET  /v1/stats/live                  → real counts for the footer/landing
Admin: /v1/admin/sources (CRUD), /v1/admin/job-runs, /v1/admin/usage, /v1/admin/flags
GET  /v1/health
```
Rate limits (Upstash): anonymous 60 req/min; Ask 5/hour anon, 25/day signed-in (protects the free AI quota). When the daily AI budget is used up, Ask shows an honest message ("Ask is resting until tomorrow — daily limit reached") and story pages keep working from cached summaries.

### 6.4 AI prompting rules (put these in the system prompts)
- Summarize **only** from the provided article texts. Never add outside facts.
- Neutral, plain language. No adjectives that editorialize ("shocking", "historic").
- Every bullet must reference ≥ 1 article index. Output JSON matching the schema.
- If articles conflict, put it in `differences`, attributing each position to its outlets.
- Headlines: ≤ 90 chars, sentence case, no clickbait, no question headlines.
- Ask: answer from retrieved chunks only; if insufficient, return `insufficient_evidence: true` and say what is known.
- Include prompt version in output; log model + tokens.

---

## 7. Pages & routes

| Route | Purpose |
|---|---|
| `/` | Front page (personalized if signed in, with "Top stories / For you" toggle) |
| `/s/[slug]` | Story page |
| `/t/[slug]` | Topic section |
| `/e/[slug]` | Entity page |
| `/thread/[slug]` | Thread timeline |
| `/search` | Full search with filters (also overlay via `/` or `⌘K`) |
| `/ask` | Ask the news (+ history when signed in) |
| `/saved` | Bookmarks |
| `/brief` | Today's personal brief (web version of the email) |
| `/settings` | Follows, mutes, reader settings, brief schedule, data export, delete account |
| `/sign-in` | Magic link + Google |
| `/sources` | All sources with live health |
| `/methodology`, `/about`, `/contact`, `/privacy`, `/terms` | Trust pages |
| `/admin/*` | Admin console |
| `not-found`, `error` | Designed, on-brand, helpful |

Use ISR for story/topic pages (revalidate 60–120s + on-demand revalidation when a story is re-summarized).

---

## 8. Repository layout

```
lede/
├─ apps/
│  ├─ web/            # Next.js 15
│  │  ├─ app/         # routes per §7
│  │  ├─ components/  # editorial/, ui/, motion/, charts/
│  │  ├─ lib/         # api client, fonts, motion presets, layout algorithm
│  │  ├─ styles/      # tokens.css, typography.css
│  │  └─ public/      # favicons, manifest, robots, security.txt
│  │  └─ app/api/v1/  # Route Handlers (thin) → packages/core
│  └─ worker/         # CLI pipeline run by GitHub Actions cron
│     └─ src/ { steps/, sources/, clustering/, ranking/, run.ts }
├─ packages/
│  ├─ core/           # services (business logic) shared by API & worker
│  ├─ ai/             # provider interface (Gemini, Groq), prompts/, schemas/
│  ├─ db/             # Drizzle schema, migrations, client (shared by web & worker)
│  ├─ types/          # shared TS types + Zod schemas
│  ├─ ui/             # design tokens, primitives
│  ├─ email/          # React Email templates
│  └─ config/         # eslint, tsconfig, tailwind preset
├─ docs/              # ADRs, runbook, demo script
├─ .github/workflows/ # ci.yml, ingest.yml (*/30 cron), brief.yml (hourly cron)
├─ docker-compose.yml # local Postgres (pgvector) + Redis
├─ turbo.json, pnpm-workspace.yaml
└─ README.md
```

---

## 9. Build plan (do it in this order; commit at the end of each phase)

**Phase 0 — Foundations**
Monorepo, TS configs, lint/format, docker-compose (Postgres + Redis), Drizzle schema + first migration, env validation, CI, ingest/brief cron workflows (disabled until Phase 1). Design tokens + fonts + typography stylesheet. A `/styleguide` page (dev-only) showing every token and component — build the design system *before* screens.

**Phase 1 — Data engine**
Source seed list (≥ 40 verified feeds across topics, incl. ≥ 10 Indian outlets), fetch + process + dedupe jobs, admin sources page with health. Exit: thousands of real articles in the DB.

**Phase 2 — Intelligence**
Embeddings, clustering, story summarization with citations, entity extraction, ranking, threads. Exit: real stories with valid cited summaries; manually review 20 and tune thresholds.

**Phase 3 — Reading experience**
Front page layout algorithm, story page (all blocks), topic & entity pages, search. Full motion system from §5. Exit: the demo flow in §2.4 works end to end on real data.

**Phase 4 — Accounts & personalization**
Auth, follows/mutes, personalized feed, bookmarks, reader settings, Ask with SSE streaming.

**Phase 5 — Trust & polish**
Privacy, Terms, Methodology, About, Contact, Sources; favicon set; OG images; sitemap; 404/500 pages; empty/error states; Daily Brief email; PWA.

**Phase 6 — Hardening**
Playwright e2e for the demo path, axe checks, Lighthouse CI, rate limits, security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy), load test key endpoints, Sentry, deploy to custom domain, write runbook + demo script in `docs/`.

---

## 10. Definition of done (checklist)

**Design**
- [ ] No banned patterns from §1.1 anywhere (grep for `gradient`, `from-purple`, `rounded-full`, emoji ranges).
- [ ] Every screen designed for 360px, 768px, 1280px, 1680px — layouts change meaningfully, not just stack.
- [ ] Light and dark mode both deliberately designed and AA-compliant.
- [ ] Typography uses the defined faces, scale, `tabular-nums`, balanced headlines.
- [ ] Skeletons match final layout; CLS < 0.05.

**Motion**
- [ ] All 12 moments in §5.2 implemented, 60fps on throttled CPU.
- [ ] Reduced-motion respected + manual toggle.

**Honesty**
- [ ] Every displayed number is computed from real data.
- [ ] Every AI bullet has a working citation; Ask refuses gracefully without evidence.
- [ ] Every article links to the original publisher; no full-text republishing of restricted sources.
- [ ] No testimonials, no fabricated metrics, no AI branding in product chrome.

**Trust & compliance**
- [ ] Custom domain + HTTPS, full favicon set, manifest, OG images.
- [ ] Privacy, Terms, Methodology, About, Contact, Sources pages live and linked in footer.
- [ ] Data export + account deletion work.

**Engineering**
- [ ] TypeScript strict, zero `any` in app code, Zod at every boundary.
- [ ] Pipeline steps idempotent with retries; admin shows job runs + source health + AI usage vs. free-tier limits.
- [ ] Monthly running cost is ₹0: no paid service, no card-required tier; app degrades gracefully when a free limit is hit.
- [ ] Postgres storage stays under ~800 MB (retention cleanup verified); all schema changes are migrations.
- [ ] Lighthouse ≥ 90/95/95/95; axe zero serious violations.
- [ ] e2e test for the demo flow passes in CI.
- [ ] README: setup in ≤ 5 commands, architecture diagram, env var table.

---

## 11. How Claude should work on this

- Start with Phase 0 and show the `/styleguide` page before building product screens — get the design language approved first.
- Prefer fewer, excellent components over many average ones.
- When unsure about a visual decision, choose the quieter, more typographic option.
- Write real copy as you go, in a calm editorial voice — specific, short, human. Never placeholder text.
- Use real data from the pipeline as early as possible; design against real headlines (long, short, ugly) rather than ideal samples.
- After each phase: run typecheck, lint, tests; screenshot key pages at mobile and desktop; review against §1 and §10; fix before moving on.
- Keep an `docs/decisions.md` log of notable choices (thresholds, model choices, trade-offs).
- Never introduce a paid service or paid tier (§3.0). Ask the owner before changing the stack.

### Environment variables the owner will need to provide (all from free accounts)
`DATABASE_URL` (Neon pooled connection string), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `GEMINI_API_KEY` (Google AI Studio), `GROQ_API_KEY`, `GUARDIAN_API_KEY`, `NYT_API_KEY`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAILS`, `AI_DAILY_REQUEST_BUDGET`.
