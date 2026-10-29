import { z } from "zod";
import { getDb } from "@/lib/db";
import { askLogs } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { AiUnavailableError, streamText } from "@/lib/ai";
import { ASK_SYSTEM, askPrompt } from "@/lib/ai/prompts";
import { hasLLM } from "@/lib/env";
import { body, clientIp, problem, rateLimit, wrap } from "@/lib/http";
import { retrieveEvidence } from "@/lib/services/search";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const schema = z.object({ question: z.string().trim().min(6, "Ask a slightly longer question.").max(300, "Keep questions under 300 characters.") });

export async function POST(req: Request) {
  return wrap(async () => {
    const { question } = await body(req, schema);
    if (!hasLLM()) return problem(503, "Ask isn’t switched on for this deployment yet.");
    const user = await getSessionUser();
    const limit = user ? await rateLimit(`ask:u:${user.id}`, 25, 86400) : await rateLimit(`ask:ip:${clientIp(req)}`, 5, 3600);
    if (!limit.ok)
      return problem(429, user ? "You’ve reached today’s limit of 25 questions. It resets tomorrow." : "You’ve asked 5 questions this hour. Sign in for a higher daily limit.");

    const evidence = await retrieveEvidence(question, 12);
    const enc = new TextEncoder();
    const send = (event: string, data: unknown) => enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          send(
            "sources",
            evidence.map((e, i) => ({ n: i + 1, outlet: e.outlet, title: e.title, url: e.url, publishedAt: e.publishedAt, storySlug: e.storySlug })),
          ),
        );
        if (evidence.length === 0) {
          const text = "Lede has no reports from the last 14 days that cover this question, so it can’t answer it. Try different words, or search for a related story.";
          controller.enqueue(send("token", text));
          controller.enqueue(send("done", { insufficient: true }));
          controller.close();
          return;
        }
        let answer = "";
        try {
          const gen = streamText({ job: "ask", system: ASK_SYSTEM, prompt: askPrompt(question, evidence) });
          let r = await gen.next();
          while (!r.done) {
            answer += r.value;
            controller.enqueue(send("token", r.value));
            r = await gen.next();
          }
          const insufficient = /^\s*INSUFFICIENT:/i.test(answer);
          controller.enqueue(send("done", { insufficient, model: r.value }));
          if (user) {
            const db = await getDb();
            const cited = [...new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))]
              .map((n) => evidence[n - 1]?.id)
              .filter((x): x is string => Boolean(x));
            await db.insert(askLogs).values({ userId: user.id, question, answer, citations: cited, insufficient, model: `${r.value.provider}:${r.value.model}` });
          }
        } catch (err) {
          const message =
            err instanceof AiUnavailableError
              ? "Ask has used today’s free capacity. Stories and search still work; Ask resets at midnight UTC."
              : "The answer couldn’t be generated just now. Try again in a minute.";
          controller.enqueue(send("error", { message }));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
    });
  });
}
