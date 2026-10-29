import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { env } from "@/lib/env";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { getSessionUser, type SessionUser } from "@/lib/auth";

export const json = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);
export const problem = (status: number, message: string) => NextResponse.json({ error: message }, { status });

let redis: Redis | null | undefined;
const limiters = new Map<string, Ratelimit>();
const memory = new Map<string, { n: number; reset: number }>();

/** Sliding-window rate limit on Upstash when configured; per-instance memory otherwise. */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; reset: number }> {
  if (redis === undefined) {
    const e = env();
    redis = e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN ? new Redis({ url: e.UPSTASH_REDIS_REST_URL, token: e.UPSTASH_REDIS_REST_TOKEN }) : null;
  }
  if (redis) {
    const id = `${limit}/${windowSec}`;
    let rl = limiters.get(id);
    if (!rl) {
      rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`), prefix: "lede:rl" });
      limiters.set(id, rl);
    }
    const r = await rl.limit(key);
    return { ok: r.success, reset: r.reset };
  }
  const now = Date.now();
  const cur = memory.get(key);
  if (!cur || cur.reset < now) {
    memory.set(key, { n: 1, reset: now + windowSec * 1000 });
    return { ok: true, reset: now + windowSec * 1000 };
  }
  cur.n++;
  return { ok: cur.n <= limit, reset: cur.reset };
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
}

type Handler<C> = (req: Request, ctx: C & { user: SessionUser }) => Promise<Response>;

/** Wraps a route that needs a signed-in reader. */
export function withUser<C = object>(handler: Handler<C>) {
  return async (req: Request, ctx: C) => {
    const user = await getSessionUser();
    if (!user) return problem(401, "Sign in to do this.");
    return wrap(() => handler(req, { ...ctx, user }));
  };
}

export function withAdmin<C = object>(handler: Handler<C>) {
  return withUser<C>(async (req, ctx) => (ctx.user.isAdmin ? handler(req, ctx) : problem(403, "Admins only.")));
}

export async function wrap(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) return problem(503, "The database is not configured yet.");
    if (err instanceof z.ZodError) return problem(400, err.issues.map((i) => i.message).join("; "));
    console.error("[api]", err);
    return problem(500, "Something went wrong on our side.");
  }
}

export async function body<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const raw = await req.json().catch(() => ({}));
  return schema.parse(raw);
}
