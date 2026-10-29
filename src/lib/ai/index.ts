import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import type { z } from "zod";
import { EMBED_DIMS } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { hasBudget, recordUsage } from "./usage";

/**
 * Provider-agnostic AI layer. Gemini (free tier) is primary; Groq (free tier)
 * is the fallback for text generation when Gemini is missing or rate limited.
 * Every call is counted against a daily request budget so the project never
 * exceeds free-tier quotas.
 */

export class AiUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "AiUnavailableError";
  }
}

/** Per-request cap. Without it a stalled provider call can hold the worker until the CI job is killed. */
const REQUEST_TIMEOUT_MS = 60_000;

let gemini: GoogleGenAI | null = null;
let groq: Groq | null = null;

function geminiClient() {
  const key = env().GEMINI_API_KEY;
  if (!key) return null;
  gemini ??= new GoogleGenAI({ apiKey: key, httpOptions: { timeout: REQUEST_TIMEOUT_MS } });
  return gemini;
}

function groqClient() {
  const key = env().GROQ_API_KEY;
  if (!key) return null;
  groq ??= new Groq({ apiKey: key, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
  return groq;
}

const geminiModel = () => env().GEMINI_MODEL ?? "gemini-3.8-flash";
const groqModel = () => env().GROQ_MODEL ?? "openai/gpt-oss-120b";
const embedModel = () => env().GEMINI_EMBED_MODEL ?? "gemini-embedding-001";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Transient provider errors worth retrying: rate limits and "model overloaded" (503). */
function isRateLimit(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err);
  const status = (err as { status?: number })?.status;
  return status === 429 || status === 503 || /429|503|RESOURCE_EXHAUSTED|UNAVAILABLE|rate limit|quota|high demand/i.test(msg);
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isRateLimit(err) || i === tries - 1) break;
      await sleep(1500 * 2 ** i);
    }
  }
  throw last;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return JSON.parse(start >= 0 ? trimmed.slice(start, end + 1) : trimmed);
}

export type ModelInfo = { provider: string; model: string };

/** Generate structured JSON validated by `schema`. */
export async function generateJson<T>(opts: {
  job: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
}): Promise<{ data: T; model: ModelInfo }> {
  if (!(await hasBudget())) throw new AiUnavailableError("Daily AI request budget reached");

  const attempts: Array<() => Promise<{ data: T; model: ModelInfo }>> = [];
  const g = geminiClient();
  if (g) {
    attempts.push(async () => {
      const model = geminiModel();
      const res = await withRetry(() =>
        g.models.generateContent({
          model,
          contents: opts.prompt,
          config: {
            systemInstruction: opts.system,
            responseMimeType: "application/json",
            temperature: opts.temperature ?? 0.2,
          },
        }),
      );
      await recordUsage({
        job: opts.job,
        provider: "gemini",
        model,
        inputTokens: res.usageMetadata?.promptTokenCount,
        outputTokens: res.usageMetadata?.candidatesTokenCount,
      });
      return { data: opts.schema.parse(extractJson(res.text ?? "")), model: { provider: "gemini", model } };
    });
  }
  const q = groqClient();
  if (q) {
    attempts.push(async () => {
      const model = groqModel();
      const res = await withRetry(() =>
        q.chat.completions.create({
          model,
          temperature: opts.temperature ?? 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.prompt },
          ],
        }),
      );
      await recordUsage({
        job: opts.job,
        provider: "groq",
        model,
        inputTokens: res.usage?.prompt_tokens,
        outputTokens: res.usage?.completion_tokens,
      });
      const text = res.choices[0]?.message?.content ?? "";
      return { data: opts.schema.parse(extractJson(text)), model: { provider: "groq", model } };
    });
  }
  if (attempts.length === 0) throw new AiUnavailableError("No AI provider configured");

  let last: unknown;
  for (const [i, attempt] of attempts.entries()) {
    try {
      return await attempt();
    } catch (err) {
      // Log every provider failure; otherwise a retired primary model hides behind the fallback's error.
      if (i < attempts.length - 1) console.warn(`[ai] ${opts.job}: falling back after`, (err as Error).message);
      last = err;
    }
  }
  throw last;
}

/** Stream plain text. Yields chunks. */
export async function* streamText(opts: {
  job: string;
  system: string;
  prompt: string;
}): AsyncGenerator<string, ModelInfo> {
  if (!(await hasBudget())) throw new AiUnavailableError("Daily AI request budget reached");
  const g = geminiClient();
  if (g) {
    const model = geminiModel();
    try {
      const stream = await withRetry(() =>
        g.models.generateContentStream({
          model,
          contents: opts.prompt,
          config: { systemInstruction: opts.system, temperature: 0.2 },
        }),
      );
      let usage: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;
      for await (const chunk of stream) {
        if (chunk.usageMetadata) usage = chunk.usageMetadata;
        if (chunk.text) yield chunk.text;
      }
      await recordUsage({
        job: opts.job,
        provider: "gemini",
        model,
        inputTokens: usage?.promptTokenCount,
        outputTokens: usage?.candidatesTokenCount,
      });
      return { provider: "gemini", model };
    } catch (err) {
      if (!groqClient()) throw err;
      console.warn(`[ai] ${opts.job}: falling back after`, (err as Error).message);
    }
  }
  const q = groqClient();
  if (!q) throw new AiUnavailableError("No AI provider configured");
  const model = groqModel();
  const stream = await q.chat.completions.create({
    model,
    stream: true,
    temperature: 0.2,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.prompt },
    ],
  });
  for await (const chunk of stream) {
    const t = chunk.choices[0]?.delta?.content;
    if (t) yield t;
  }
  await recordUsage({ job: opts.job, provider: "groq", model });
  return { provider: "groq", model };
}

/** Embed texts (batched). Returns null when no embedding provider is configured. */
export async function embed(
  texts: string[],
  task: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT",
  job = "embed",
): Promise<number[][] | null> {
  const g = geminiClient();
  if (!g || texts.length === 0) return null;
  if (!(await hasBudget())) throw new AiUnavailableError("Daily AI request budget reached");
  const model = embedModel();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 50) {
    const batch = texts.slice(i, i + 50);
    const res = await withRetry(() =>
      g.models.embedContent({
        model,
        contents: batch,
        config: { outputDimensionality: EMBED_DIMS, taskType: task },
      }),
    );
    await recordUsage({ job, provider: "gemini", model });
    for (const e of res.embeddings ?? []) out.push(normalize(e.values ?? []));
  }
  return out;
}

function normalize(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}
