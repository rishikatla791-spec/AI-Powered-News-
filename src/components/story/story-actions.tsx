"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { AnimatePresence, motion } from "motion/react";
import { Bookmark, BookmarkCheck, Flag, Link2, Pause, Volume2 } from "lucide-react";
import { patchMe, useMe } from "@/lib/client/use-me";
import { useClientValue } from "@/lib/client/use-client-value";

export function SaveButton({ storyId }: { storyId: string }) {
  const { me } = useMe();
  const pathname = usePathname();
  const saved = me.bookmarks.includes(storyId);
  const [busy, setBusy] = useState(false);

  if (!me.user) {
    return (
      <Link href={`/sign-in?next=${encodeURIComponent(pathname ?? "/")}`} className="btn btn-secondary h-9 gap-2">
        <Bookmark size={16} strokeWidth={1.75} /> Save
      </Link>
    );
  }

  async function toggle() {
    setBusy(true);
    patchMe((m) => ({ ...m, bookmarks: saved ? m.bookmarks.filter((b) => b !== storyId) : [...m.bookmarks, storyId] }));
    const res = await fetch("/api/v1/me/bookmarks", {
      method: saved ? "DELETE" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storyId }),
    }).catch(() => null);
    if (!res?.ok) patchMe((m) => ({ ...m, bookmarks: saved ? [...m.bookmarks, storyId] : m.bookmarks.filter((b) => b !== storyId) }));
    setBusy(false);
  }

  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={saved} className={`btn h-9 gap-2 ${saved ? "btn-primary" : "btn-secondary"}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={String(saved)} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.16 }}>
          {saved ? <BookmarkCheck size={16} strokeWidth={1.75} /> : <Bookmark size={16} strokeWidth={1.75} />}
        </motion.span>
      </AnimatePresence>
      {saved ? "Saved" : "Save"}
    </button>
  );
}

export function FollowButton({ type, slug, label }: { type: "topic" | "entity" | "source"; slug: string; label: string }) {
  const { me } = useMe();
  const pathname = usePathname();
  const following = me.follows.some((f) => f.targetType === type && f.targetSlug === slug && !f.muted);

  if (!me.user) {
    return (
      <Link href={`/sign-in?next=${encodeURIComponent(pathname ?? "/")}`} className="btn btn-secondary h-9">
        Follow {label}
      </Link>
    );
  }

  async function toggle() {
    const next = !following;
    patchMe((m) => ({
      ...m,
      follows: next
        ? [...m.follows.filter((f) => !(f.targetType === type && f.targetSlug === slug)), { targetType: type, targetSlug: slug, muted: false }]
        : m.follows.filter((f) => !(f.targetType === type && f.targetSlug === slug)),
    }));
    await fetch("/api/v1/me/follows", {
      method: next ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: type, targetSlug: slug }),
    }).catch(() => null);
  }

  return (
    <button type="button" onClick={toggle} aria-pressed={following} className={`btn h-9 gap-2 ${following ? "btn-primary" : "btn-secondary"}`}>
      {following && (
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <motion.path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
        </svg>
      )}
      {following ? `Following ${label}` : `Follow ${label}`}
    </button>
  );
}

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button type="button" onClick={share} className="btn btn-quiet h-9 gap-2">
      <Link2 size={16} strokeWidth={1.75} />
      <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
    </button>
  );
}

/** Reads the headline and summary aloud with the browser's own speech engine (no server cost). */
export function ListenButton({ text }: { text: string }) {
  const supported = useClientValue(() => "speechSynthesis" in window, false);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    };
  }, []);
  if (!supported) return null;
  function toggle() {
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    u.rate = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    speechSynthesis.speak(u);
    setSpeaking(true);
  }
  return (
    <button type="button" onClick={toggle} aria-pressed={speaking} className="btn btn-quiet h-9 gap-2">
      {speaking ? <Pause size={16} strokeWidth={1.75} /> : <Volume2 size={16} strokeWidth={1.75} />}
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}

const REASONS = [
  "A line isn’t supported by its sources",
  "Reports about different events were grouped together",
  "The headline is misleading",
  "Something else",
];

export function ReportButton({ storyId }: { storyId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]!);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const first = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const res = await fetch("/api/v1/flags", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storyId, reason, note }),
    }).catch(() => null);
    setState(res?.ok ? "sent" : "error");
  }

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o && state === "sent") { setState("idle"); setNote(""); } }}>
      <Popover.Trigger className="btn btn-quiet h-9 gap-2 text-ink-muted">
        <Flag size={16} strokeWidth={1.75} /> Report a problem
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          onOpenAutoFocus={(e) => { e.preventDefault(); first.current?.focus(); }}
          className="z-50 w-[min(92vw,380px)] rounded-lg border border-rule bg-paper-raised p-5 shadow-[0_16px_48px_-12px_rgb(0_0_0/0.3)]"
        >
          {state === "sent" ? (
            <div>
              <p className="font-semibold">Report sent</p>
              <p className="mt-1 text-[0.9375rem] text-ink-2">An editor reviews every report. Corrections are noted on the story.</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <fieldset>
                <legend className="font-semibold">What’s wrong with this story?</legend>
                <div className="mt-3 space-y-2">
                  {REASONS.map((r, i) => (
                    <label key={r} className="flex cursor-pointer items-start gap-2.5 text-[0.9375rem] text-ink-2">
                      <input ref={i === 0 ? first : undefined} type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="mt-1 accent-[var(--pencil)]" />
                      {r}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="mt-4 block text-[0.875rem] font-medium">
                Details (optional)
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={800} rows={3} className="field mt-1.5 h-auto py-2 text-[0.9375rem]" />
              </label>
              {state === "error" && <p className="mt-2 text-[0.875rem] text-danger">The report didn’t send. Check your connection and try again.</p>}
              <div className="mt-4 flex justify-end gap-2">
                <Popover.Close className="btn btn-quiet h-9">Cancel</Popover.Close>
                <button type="submit" disabled={state === "sending"} className="btn btn-primary h-9">
                  {state === "sending" ? "Sending…" : "Send report"}
                </button>
              </div>
            </form>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
