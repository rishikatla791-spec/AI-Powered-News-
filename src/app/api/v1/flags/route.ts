import { z } from "zod";
import { getDb } from "@/lib/db";
import { flags } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { body, clientIp, json, problem, rateLimit, wrap } from "@/lib/http";

const schema = z.object({ storyId: z.uuid(), reason: z.string().min(3).max(120), note: z.string().max(800).optional() });

export async function POST(req: Request) {
  return wrap(async () => {
    if (!(await rateLimit(`flags:${clientIp(req)}`, 8, 3600)).ok) return problem(429, "Too many reports from this connection. Try again later.");
    const b = await body(req, schema);
    const user = await getSessionUser();
    const db = await getDb();
    await db.insert(flags).values({ storyId: b.storyId, reason: b.reason, note: b.note || null, userId: user?.id ?? null });
    return json({ ok: true }, { status: 201 });
  });
}
