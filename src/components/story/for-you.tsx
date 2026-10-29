"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StoryCard } from "@/lib/services/stories";
import { useMe } from "@/lib/client/use-me";
import { StandardStory } from "./story-block";
import { Reveal } from "@/components/motion/reveal";

/** Stories from the sections, people and places the reader follows. Loaded client-side so the front page stays cached. */
export function ForYou() {
  const { me, loaded } = useMe();
  const [stories, setStories] = useState<StoryCard[] | null>(null);
  const following = me.follows.filter((f) => !f.muted);

  useEffect(() => {
    if (!me.user || following.length === 0) return;
    let live = true;
    fetch("/api/v1/me/feed", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { stories: [] }))
      .then((d: { stories: StoryCard[] }) => live && setStories(d.stories))
      .catch(() => live && setStories([]));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.user?.id, following.length]);

  if (!loaded || !me.user) return null;

  if (following.length === 0) {
    return (
      <section className="mb-12 flex flex-col gap-3 rounded-lg border border-dashed border-rule-strong px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.9375rem] text-ink-2">Follow sections, people or places and their stories will appear here first.</p>
        <Link href="/settings#follows" className="btn btn-secondary h-9 shrink-0">
          Choose what to follow
        </Link>
      </section>
    );
  }
  if (!stories || stories.length === 0) return null;

  return (
    <section aria-labelledby="for-you" className="border-t border-rule pt-10 pb-14">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="for-you" className="hed hed-lg">
          From what you follow
        </h2>
        <Link href="/settings#follows" className="link-draw text-[0.9375rem] text-ink-muted hover:text-ink">
          Edit follows
        </Link>
      </div>
      <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {stories.slice(0, 4).map((s, i) => (
          <Reveal key={s.id} delay={i * 0.05}>
            <StandardStory story={s} showTopic />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
