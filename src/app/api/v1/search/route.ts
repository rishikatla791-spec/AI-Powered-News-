import { clientIp, json, problem, rateLimit, wrap } from "@/lib/http";
import { searchAll } from "@/lib/services/search";
import { isTopic } from "@/lib/topics";

export async function GET(req: Request) {
  return wrap(async () => {
    if (!(await rateLimit(`search:${clientIp(req)}`, 60, 60)).ok) return problem(429, "Too many searches. Wait a minute and try again.");
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const topic = url.searchParams.get("topic") ?? undefined;
    const days = Number(url.searchParams.get("days") ?? 30);
    const limit = Math.min(30, Number(url.searchParams.get("limit") ?? 20));
    // The palette searches as you type: keyword only, to save the free embedding quota.
    const r = await searchAll(q, { topic: topic && isTopic(topic) ? topic : undefined, days: [1, 7, 30].includes(days) ? days : 30, semantic: limit > 10 });
    return json({ ...r, stories: r.stories.slice(0, limit) }, { headers: { "cache-control": "public, s-maxage=60" } });
  });
}
