import { z } from "zod";
import { TOPIC_SLUGS } from "@/lib/topics";

export const PROMPT_VERSION = "story-v1";

export type PromptArticle = {
  outlet: string;
  title: string;
  excerpt: string | null;
  content?: string | null;
  publishedAt: Date;
};

const citations = z.array(z.number().int().positive()).min(1);

export const storySummarySchema = z.object({
  headline: z.string().min(8).max(120),
  dek: z.string().max(240).optional().default(""),
  topic: z.enum(TOPIC_SLUGS),
  whatWeKnow: z
    .array(z.object({ text: z.string().min(8).max(400), citations }))
    .min(1)
    .max(6),
  differences: z
    .array(
      z.object({
        point: z.string().min(4).max(200),
        positions: z.array(z.object({ text: z.string().min(4).max(300), citations })).min(2).max(4),
      }),
    )
    .max(3)
    .default([]),
  entities: z
    .array(z.object({ name: z.string().min(2).max(80), type: z.enum(["person", "org", "place", "event"]) }))
    .max(10)
    .default([]),
});
export type StorySummaryOutput = z.infer<typeof storySummarySchema>;

export const STORY_SYSTEM = `You are a careful wire-desk editor. You write neutral, plain-language summaries of news events using ONLY the numbered reports provided.

Rules:
- Use only facts present in the reports. Never add outside knowledge, context, or speculation.
- Every bullet in "whatWeKnow" must cite one or more report numbers that directly support it.
- Neutral wording. No adjectives that editorialize ("shocking", "historic", "massive"). No exclamation marks.
- If reports disagree on a fact, number, cause, or characterisation, add an entry to "differences" that attributes each position to the reports that state it. If they do not disagree, return an empty "differences" array. Do not invent disagreement.
- "headline": factual, sentence case, at most 90 characters, no question, no clickbait, no outlet names.
- "dek": one sentence (at most 200 characters) giving the most important context from the reports.
- "topic": one of ${TOPIC_SLUGS.join(", ")}.
- "entities": the main people, organisations, places or named events, as named in the reports.
- 3 to 6 bullets in "whatWeKnow" when the reports support it; fewer if they do not. Each bullet one or two sentences.
- Respond with JSON only, matching:
{"headline": string, "dek": string, "topic": string, "whatWeKnow": [{"text": string, "citations": number[]}], "differences": [{"point": string, "positions": [{"text": string, "citations": number[]}]}], "entities": [{"name": string, "type": "person"|"org"|"place"|"event"}]}`;

export function storyPrompt(items: PromptArticle[]): string {
  return items
    .map((a, i) => {
      const body = (a.content ?? a.excerpt ?? "").replace(/\s+/g, " ").slice(0, 900);
      return `[${i + 1}] ${a.outlet} — ${a.publishedAt.toISOString()}\nTitle: ${a.title}\n${body}`;
    })
    .join("\n\n");
}

/** Drop citations outside 1..n and bullets left without any. */
export function sanitizeSummary(out: StorySummaryOutput, n: number): StorySummaryOutput {
  const ok = (c: number[]) => [...new Set(c.filter((x) => x >= 1 && x <= n))];
  return {
    ...out,
    whatWeKnow: out.whatWeKnow
      .map((b) => ({ ...b, citations: ok(b.citations) }))
      .filter((b) => b.citations.length > 0),
    differences: out.differences
      .map((d) => ({
        ...d,
        positions: d.positions
          .map((p) => ({ ...p, citations: ok(p.citations) }))
          .filter((p) => p.citations.length > 0),
      }))
      .filter((d) => d.positions.length >= 2),
  };
}

export const ASK_SYSTEM = `You answer questions about current news using ONLY the numbered reports provided.

Rules:
- Cite sources inline with bracketed numbers like [2] or [1][4] immediately after the sentence they support.
- Use only facts from the reports. Never use outside knowledge, even if you know the answer.
- If the reports do not contain enough information to answer, start your answer with "INSUFFICIENT:" and then say briefly what the reports do cover.
- Be concise: at most 180 words. Plain, neutral language. No headings, no bullet lists unless the question asks for a list.`;

export function askPrompt(question: string, items: PromptArticle[]): string {
  return `Reports:\n\n${storyPrompt(items)}\n\nQuestion: ${question}`;
}
