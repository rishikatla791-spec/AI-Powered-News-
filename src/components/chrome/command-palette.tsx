"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { Bookmark, CornerDownLeft, FileText, Hash, MessageSquareText, Search, Settings, UserRound } from "lucide-react";
import { TOPICS } from "@/lib/topics";
import { timeAgo } from "@/lib/format";

const OPEN_EVENT = "lede:palette";
export function openPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Result = {
  stories: { slug: string; headline: string; outletCount: number; lastUpdatedAt: string }[];
  entities: { slug: string; name: string; type: string }[];
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [fetched, setResults] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const id = setTimeout(async () => {
      ctrl.current?.abort();
      ctrl.current = new AbortController();
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(term)}&limit=8`, { signal: ctrl.current.signal });
        if (res.ok) setResults(await res.json());
      } catch {
        /* aborted or offline */
      } finally {
        setLoading(false);
      }
    }, 160);
    return () => clearTimeout(id);
  }, [q]);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  const term = q.trim();
  const results = term.length >= 2 ? fetched : null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-[rgb(20_22_26/0.36)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild aria-describedby={undefined}>
              <motion.div
                className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-32px)] max-w-[640px] overflow-hidden rounded-xl border border-rule bg-paper-raised shadow-[0_24px_64px_-16px_rgb(0_0_0/0.35)]"
                initial={{ opacity: 0, y: -8, x: "-50%", scale: 0.985 }}
                animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                exit={{ opacity: 0, y: -6, x: "-50%", scale: 0.99 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <Dialog.Title className="sr-only">Search Lede</Dialog.Title>
                <Command shouldFilter={false} loop label="Search Lede">
                  <div className="flex items-center gap-3 border-b border-rule px-4">
                    <Search size={18} strokeWidth={1.75} className="shrink-0 text-ink-muted" />
                    <Command.Input
                      value={q}
                      onValueChange={setQ}
                      autoFocus
                      placeholder="Search stories, people, places"
                      className="h-14 w-full bg-transparent text-[1.0625rem] outline-none placeholder:text-ink-muted"
                    />
                    {loading && <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-rule border-t-pencil" />}
                  </div>
                  <Command.List className="max-h-[min(60vh,480px)] overflow-y-auto overscroll-contain p-2" data-lenis-prevent>
                    {term.length >= 2 && results && results.stories.length === 0 && results.entities.length === 0 && !loading && (
                      <Command.Empty className="px-3 py-8 text-center text-[0.9375rem] text-ink-muted">
                        Nothing in the last 30 days matches “{term}”.
                      </Command.Empty>
                    )}
                    {term.length >= 2 && (
                      <Command.Item value={`ask:${term}`} onSelect={() => go(`/ask?q=${encodeURIComponent(term)}`)} className={itemCls}>
                        <MessageSquareText size={16} strokeWidth={1.75} className="text-pencil" />
                        <span className="truncate">
                          Ask the news: <span className="text-ink">{term}</span>
                        </span>
                      </Command.Item>
                    )}
                    {results && results.stories.length > 0 && (
                      <Command.Group heading="Stories" className={groupCls}>
                        {results.stories.map((s) => (
                          <Command.Item key={s.slug} value={`story:${s.slug}`} onSelect={() => go(`/s/${s.slug}`)} className={itemCls}>
                            <FileText size={16} strokeWidth={1.75} className="shrink-0 text-ink-muted" />
                            <span className="min-w-0 flex-1 truncate">{s.headline}</span>
                            <span className="meta shrink-0">
                              {s.outletCount} {s.outletCount === 1 ? "outlet" : "outlets"}, {timeAgo(s.lastUpdatedAt)}
                            </span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}
                    {results && results.entities.length > 0 && (
                      <Command.Group heading="People, organisations and places" className={groupCls}>
                        {results.entities.map((e) => (
                          <Command.Item key={e.slug} value={`entity:${e.slug}`} onSelect={() => go(`/e/${e.slug}`)} className={itemCls}>
                            <UserRound size={16} strokeWidth={1.75} className="text-ink-muted" />
                            {e.name}
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}
                    {term.length >= 2 && (
                      <Command.Item value={`search:${term}`} onSelect={() => go(`/search?q=${encodeURIComponent(term)}`)} className={itemCls}>
                        <Search size={16} strokeWidth={1.75} className="text-ink-muted" />
                        See all results for “{term}”
                      </Command.Item>
                    )}
                    {term.length < 2 && (
                      <>
                        <Command.Group heading="Sections" className={groupCls}>
                          {TOPICS.map((t) => (
                            <Command.Item key={t.slug} value={`topic:${t.slug}`} onSelect={() => go(`/t/${t.slug}`)} className={itemCls}>
                              <Hash size={16} strokeWidth={1.75} className="text-ink-muted" />
                              {t.name}
                            </Command.Item>
                          ))}
                        </Command.Group>
                        <Command.Group heading="Go to" className={groupCls}>
                          <Command.Item value="go:ask" onSelect={() => go("/ask")} className={itemCls}>
                            <MessageSquareText size={16} strokeWidth={1.75} className="text-ink-muted" />
                            Ask the news
                          </Command.Item>
                          <Command.Item value="go:saved" onSelect={() => go("/saved")} className={itemCls}>
                            <Bookmark size={16} strokeWidth={1.75} className="text-ink-muted" />
                            Saved stories
                          </Command.Item>
                          <Command.Item value="go:settings" onSelect={() => go("/settings")} className={itemCls}>
                            <Settings size={16} strokeWidth={1.75} className="text-ink-muted" />
                            Settings
                          </Command.Item>
                        </Command.Group>
                      </>
                    )}
                  </Command.List>
                  <div className="flex items-center gap-4 border-t border-rule px-4 py-2.5 text-[0.75rem] text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <CornerDownLeft size={12} /> to open
                    </span>
                    <span>↑ ↓ to move</span>
                    <span>Esc to close</span>
                  </div>
                </Command>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

const itemCls =
  "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-[0.9375rem] text-ink-2 data-[selected=true]:bg-pencil-soft data-[selected=true]:text-ink";
const groupCls =
  "mt-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[0.75rem] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-muted";
