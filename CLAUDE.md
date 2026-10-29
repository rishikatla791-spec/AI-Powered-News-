# Lede: AI-powered news aggregator

@AGENTS.md

Read `docs/PROJECT_SPEC.md` (product spec) and `docs/decisions.md` (what was actually built and why; it wins over the spec) before changing anything.

Standing rules:
- Production-grade bar. Design and engineering quality come first.
- Never make the UI look AI-generated: no purple/blue gradients, gradient pill buttons, vague hero copy, emojis, sparkle "AI" badges, all-caps eyebrow labels or default component-kit styling. Use the design tokens in `src/app/globals.css` (the editor's desk: graphite, proof-paper, blue pencil, highlighter) and the existing components.
- Never fabricate reviews, testimonials, user counts or metrics. Every number shown comes from the database. Every summary line must cite its reports.
- Zero cost: free tiers only (Vercel Hobby, GitHub Actions, Neon, Upstash, Gemini/Groq, Resend). Never add a paid service.
- Before committing: `npm run typecheck && npm run lint && npm test && npm run build`.
