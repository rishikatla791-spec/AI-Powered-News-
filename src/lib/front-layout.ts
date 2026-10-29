import type { StoryCard } from "@/lib/services/stories";
import { TOPICS } from "@/lib/topics";

export type FrontSection = { topic: string; name: string; stories: StoryCard[]; variant: "feature-left" | "feature-right" | "row" };

export type FrontLayout = {
  lead: StoryCard | null;
  developing: StoryCard[];
  railTitle: string;
  features: StoryCard[];
  alsoToday: StoryCard[];
  sections: FrontSection[];
  justIn: StoryCard[];
};

/**
 * Composes the front page from ranked stories, the way a desk editor would:
 * the most-corroborated story leads, developing stories get a rail, strong
 * images become features, and the rest are grouped by section with varied layouts.
 */
export function composeFrontPage(ranked: StoryCard[]): FrontLayout {
  const used = new Set<string>();
  const take = (s: StoryCard | undefined) => {
    if (s) used.add(s.id);
    return s;
  };
  const free = () => ranked.filter((s) => !used.has(s.id));

  const multi = ranked.filter((s) => s.outletCount > 1);
  const lead = take(multi.slice(0, 3).find((s) => s.leadImageUrl) ?? multi[0] ?? ranked[0]) ?? null;

  let developing = free()
    .filter((s) => s.status === "developing" && s.outletCount > 1)
    .slice(0, 5);
  let railTitle = "Developing";
  if (developing.length < 3) {
    developing = free()
      .filter((s) => s.outletCount > 1)
      .sort((a, b) => b.outletCount - a.outletCount)
      .slice(0, 5);
    railTitle = "Most reported today";
  }
  developing.forEach(take);

  const features = free()
    .filter((s) => s.leadImageUrl && s.outletCount > 1)
    .slice(0, 2);
  features.forEach(take);

  const alsoToday = free()
    .filter((s) => s.outletCount > 1)
    .slice(0, 3);
  alsoToday.forEach(take);

  const sections: FrontSection[] = [];
  const variants: FrontSection["variant"][] = ["feature-left", "row", "feature-right"];
  for (const t of TOPICS) {
    const list = free()
      .filter((s) => s.topicSlug === t.slug)
      .sort((a, b) => b.outletCount - a.outletCount || b.importance - a.importance)
      .slice(0, 4);
    if (list.length < 2) continue;
    list.forEach(take);
    let variant = variants[sections.length % variants.length]!;
    // A feature needs a picture to carry it; a row needs enough stories to fill it.
    if (variant !== "row" && !list[0]?.leadImageUrl) {
      const withImage = list.findIndex((s) => s.leadImageUrl);
      if (withImage > 0) list.unshift(...list.splice(withImage, 1));
      else variant = "row";
    }
    if (variant === "row" && list.length < 3) variant = "feature-left";
    sections.push({ topic: t.slug, name: t.name, stories: list, variant });
  }

  const justIn = free()
    .filter((s) => s.outletCount === 1)
    .sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime())
    .slice(0, 8);

  return { lead, developing, railTitle, features, alsoToday, sections, justIn };
}
