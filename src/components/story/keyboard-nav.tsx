"use client";

import { useEffect } from "react";
import { scrollToElement } from "@/components/motion/smooth-scroll";

/** j / k move between stories on list pages. */
export function KeyboardNav() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key !== "j" && e.key !== "k") return;
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('main article a[href^="/s/"]'));
      if (!links.length) return;
      const current = links.indexOf(document.activeElement as HTMLAnchorElement);
      const next = e.key === "j" ? Math.min(links.length - 1, current + 1) : Math.max(0, current - 1);
      const el = links[current === -1 ? 0 : next];
      if (!el) return;
      e.preventDefault();
      el.focus({ preventScroll: true });
      scrollToElement(el.closest("article") ?? el, -140);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
