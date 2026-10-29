# Demo script (about 6 minutes)

Live site: https://ai-powered-news.vercel.app

## Before you present

- **Once, any day before:** open `/sign-in` → **Create account** with the email listed in `ADMIN_EMAILS`. That account can open `/admin`.
- **30–60 minutes before:** GitHub → Actions → **Ingest news** → **Run workflow** (it also runs every 30 minutes on its own). This pulls fresh reports and writes summaries for new stories.
- **A minute before:** open the site so the database is awake, and sign in.

## The walkthrough

1. **Front page.** Point out the edition line: it shows the real number of reports and outlets from the last 24 hours. The lead is the most corroborated story. The marks under each headline are the coverage strip, one per outlet, with the first reporter in blue.
2. **Open the lead story.** The headline rises in, then "How the story spread" replays coverage in the order it was published. Hover a mark to see which outlet published at that time.
3. **What we know.** Hover a citation number: the sentence is highlighted and the matching original report lights up on the right. Click it to jump there. Every report links out to the publisher.
4. **Where reports differ.** Show a real disagreement between outlets, each side cited.
5. **How we got here.** If the story is part of a thread, scroll the timeline; it draws as you go.
6. **⌘K / Ctrl K.** Search a person or place, open their page.
7. **Ask the news.** Ask about a current story and watch the cited answer stream in. Then ask something the reports can't answer (e.g. a question about next year's events) to show it declines honestly.
8. **Sign in → follow two sections.** Sign in with email and password. Follow two sections; the front page now opens with "From what you follow".
9. **Settings → Your data.** Download my data, delete account: the privacy promises are real.
10. **Admin.** Ingestion runs from GitHub Actions, feed health, AI usage against the free-tier budget, reported problems.
11. **Close on /methodology.** Show how grouping, summaries and ranking work, including the known limitations.

## Talking points

- **Zero cost.** Vercel Hobby (site and API), GitHub Actions (the worker, every 30 minutes), Neon Postgres with pgvector, Gemini with Groq as fallback, all on free tiers.
- **Grouping.** Reports are embedded with Gemini and grouped when they describe the same event (cosine ≥ 0.88 to a member and ≥ 0.84 to the story). Every run re-checks recent stories and moves reports that don't belong. `docs/decisions.md` explains how the thresholds were calibrated on real articles.
- **Trust.** Summaries are written only from the grouped reports, every line cites them, and citations that point nowhere are removed before publishing. A story covered by one outlet is shown as-is, not summarised.
