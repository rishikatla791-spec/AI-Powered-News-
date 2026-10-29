import { unsubscribeUrl } from "@/lib/brief-token";
import { briefEmail } from "@/lib/email-templates";
import { formatDate } from "@/lib/format";
import { getPersonalFeed } from "@/lib/services/reader";
import { getFrontPage, type StoryCard } from "@/lib/services/stories";

export type BriefMessage = { subject: string; html: string; text: string; headers: Record<string, string> };

/** Stories corroborated by two or more outlets, most important first. Shared by every brief in one run. */
export async function briefTopStories(): Promise<StoryCard[]> {
  return (await getFrontPage({ limit: 20 })).stories.filter((s) => s.outletCount > 1);
}

/**
 * One reader's brief: up to three stories from what they follow, then the most-reported stories,
 * eight in all. Returns null when there is nothing worth sending.
 */
export async function composeBrief(userId: string, top: StoryCard[], now = new Date()): Promise<BriefMessage | null> {
  const personal = await getPersonalFeed(userId);
  const seen = new Set<string>();
  const items = [...personal.slice(0, 3), ...top]
    .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
    .slice(0, 8)
    .map((s) => ({ headline: s.headline, slug: s.slug, keyPoint: s.keyPoint, outletCount: s.outletCount }));
  if (items.length === 0) return null;
  const unsub = unsubscribeUrl(userId);
  const { subject, html, text } = briefEmail(items, formatDate(now, { weekday: "long", day: "numeric", month: "long" }), unsub);
  return { subject, html, text, headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
}
