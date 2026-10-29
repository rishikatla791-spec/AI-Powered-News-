import { z } from "zod";

/**
 * Environment access. Every variable is optional at build time so the site can
 * deploy before keys are configured; features check `has*()` and degrade honestly.
 */
const schema = z.object({
  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  CONTACT_EMAIL: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_EMBED_MODEL: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
  AI_DAILY_REQUEST_BUDGET: z.coerce.number().int().positive().optional(),
  GUARDIAN_API_KEY: z.string().optional(),
  NYT_API_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  REVALIDATE_SECRET: z.string().optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  VERCEL_BRANCH_URL: z.string().optional(),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (!cached) {
    const raw = Object.fromEntries(
      Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v]),
    );
    cached = schema.parse(raw);
  }
  return cached;
}

export function siteUrl(): string {
  const e = env();
  if (e.NEXT_PUBLIC_SITE_URL) return e.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (e.VERCEL_PROJECT_PRODUCTION_URL) return `https://${e.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (e.VERCEL_URL) return `https://${e.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Every origin this deployment can be reached on (production domain, preview URLs). */
export function trustedOrigins(): string[] {
  const e = env();
  return [siteUrl(), e.VERCEL_URL, e.VERCEL_BRANCH_URL, e.VERCEL_PROJECT_PRODUCTION_URL]
    .filter((x): x is string => Boolean(x))
    .map((x) => (x.startsWith("http") ? x : `https://${x}`));
}

export const hasDatabase = () => Boolean(env().DATABASE_URL);
export const hasLLM = () => Boolean(env().GEMINI_API_KEY || env().GROQ_API_KEY);
export const hasEmbeddings = () => Boolean(env().GEMINI_API_KEY);
export const hasGoogleAuth = () => Boolean(env().GOOGLE_CLIENT_ID && env().GOOGLE_CLIENT_SECRET);
export const hasEmail = () => Boolean(env().RESEND_API_KEY);
export const hasAuth = () => Boolean(env().BETTER_AUTH_SECRET && hasDatabase());

export function adminEmails(): string[] {
  return (env().ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const contactEmail = () => env().CONTACT_EMAIL ?? "hello@example.com";
