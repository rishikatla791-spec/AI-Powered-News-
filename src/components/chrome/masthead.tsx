"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { useClientValue } from "@/lib/client/use-client-value";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { Search, UserRound } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { TOPICS } from "@/lib/topics";
import { useMe } from "@/lib/client/use-me";
import { openPalette } from "./command-palette";

export function Masthead() {
  const pathname = usePathname();
  const { me } = useMe();
  const { scrollY } = useScroll();
  const [compact, setCompact] = useState(false);
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  const isMac = useClientValue(() => /Mac|iPhone|iPad/.test(navigator.platform), true);

  useMotionValueEvent(scrollY, "change", (y) => {
    const delta = y - last.current;
    last.current = y;
    setCompact(y > 48);
    // Slide away when reading downwards, return as soon as the reader scrolls up.
    if (y > 320 && delta > 6) setHidden(true);
    else if (delta < -4 || y < 320) setHidden(false);
  });

  if (pathname?.startsWith("/admin")) return null;

  return (
    <motion.header
      initial={false}
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 border-b border-rule bg-paper/92 backdrop-blur-md supports-[backdrop-filter]:bg-paper/80"
    >
      <div className="shell">
        <motion.div
          initial={false}
          animate={{ height: compact ? 56 : 72 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-6"
        >
          <Link href="/" className="shrink-0 rounded-sm" aria-label="Lede front page">
            <motion.span
              initial={false}
              animate={{ scale: compact ? 0.84 : 1 }}
              style={{ originX: 0, originY: 0.5, display: "inline-block" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <Wordmark />
            </motion.span>
          </Link>

          <nav aria-label="Sections" className="-mx-2 hidden min-w-0 flex-1 items-center overflow-x-auto lg:flex">
            {TOPICS.map((t) => {
              const href = `/t/${t.slug}`;
              const active = pathname === href;
              return (
                <Link
                  key={t.slug}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative shrink-0 rounded-md px-2.5 py-1.5 text-[0.9375rem] transition-colors ${
                    active ? "text-ink" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {t.name}
                  {active && (
                    <motion.span layoutId="nav-underline" className="absolute inset-x-2.5 -bottom-[3px] h-[2px] rounded-full bg-pencil" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={openPalette}
              className="btn btn-quiet h-9 gap-2 text-ink-muted"
              aria-label="Search stories, topics and people"
            >
              <Search size={17} strokeWidth={1.75} />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded border border-rule px-1.5 text-[0.6875rem] text-ink-muted md:inline">
                {isMac ? "⌘K" : "Ctrl K"}
              </kbd>
            </button>
            <Link href="/ask" className="btn btn-quiet h-9">
              Ask
            </Link>
            {me.user ? (
              <Link href="/settings" className="btn btn-quiet h-9 gap-2" aria-label="Your settings">
                <span className="grid size-7 place-items-center rounded-full bg-pencil-soft text-[0.8125rem] font-semibold text-pencil">
                  {(me.user.name || me.user.email).charAt(0).toUpperCase()}
                </span>
              </Link>
            ) : (
              <Link href="/sign-in" className="btn btn-quiet h-9 gap-2">
                <UserRound size={17} strokeWidth={1.75} className="sm:hidden" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}
          </div>
        </motion.div>

        <nav aria-label="Sections" className="-mx-4 flex gap-1 overflow-x-auto px-2 pb-2 lg:hidden [scrollbar-width:none]">
          {TOPICS.map((t) => {
            const href = `/t/${t.slug}`;
            const active = pathname === href;
            return (
              <Link
                key={t.slug}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-full px-3 py-1 text-[0.875rem] ${active ? "bg-ink text-paper" : "text-ink-muted"}`}
              >
                {t.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </motion.header>
  );
}
