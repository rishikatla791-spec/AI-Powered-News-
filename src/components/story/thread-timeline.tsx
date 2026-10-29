"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { formatDate } from "@/lib/format";
import { prefersReducedMotion } from "@/components/motion/smooth-scroll";

type Item = { id: string; slug: string; headline: string; firstSeenAt: string; outletCount: number; current: boolean };

/** Earlier stories in the same thread. The line draws as the reader scrolls; each event fills when reached. */
export function ThreadTimeline({ items }: { items: Item[] }) {
  const root = useRef<HTMLOListElement>(null);
  const line = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current || !line.current || prefersReducedMotion()) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        line.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          transformOrigin: "top center",
          scrollTrigger: { trigger: root.current, start: "top 75%", end: "bottom 60%", scrub: 0.4 },
        },
      );
      gsap.utils.toArray<HTMLElement>("[data-node]").forEach((node) => {
        gsap.fromTo(
          node,
          { backgroundColor: "var(--paper)", scale: 0.6 },
          { backgroundColor: "var(--pencil)", scale: 1, duration: 0.3, scrollTrigger: { trigger: node, start: "top 62%", toggleActions: "play none none reverse" } },
        );
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <ol ref={root} className="relative ml-[7px]">
      <div className="absolute top-2 bottom-2 left-0 w-[2px] -translate-x-1/2 bg-rule" aria-hidden />
      <div ref={line} className="absolute top-2 bottom-2 left-0 w-[2px] -translate-x-1/2 bg-pencil" aria-hidden />
      {items.map((s) => (
        <li key={s.id} className="relative pb-9 pl-8 last:pb-0">
          <span
            data-node
            aria-hidden
            className="absolute top-[0.45rem] left-0 size-[13px] -translate-x-1/2 rounded-full border-2 border-pencil bg-pencil"
          />
          <p className="meta">{formatDate(s.firstSeenAt, { weekday: "short", day: "numeric", month: "short" })}</p>
          {s.current ? (
            <p className="hed hed-sm mt-1">
              {s.headline} <span className="ml-1 align-middle text-[0.75rem] font-medium text-ink-muted">You are here</span>
            </p>
          ) : (
            <Link href={`/s/${s.slug}`} className="hed hed-sm mt-1 block hover:text-pencil">
              {s.headline}
            </Link>
          )}
          <p className="meta mt-1">
            {s.outletCount} {s.outletCount === 1 ? "outlet" : "outlets"}
          </p>
        </li>
      ))}
    </ol>
  );
}
