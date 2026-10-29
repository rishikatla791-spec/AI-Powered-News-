"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { TOPICS } from "@/lib/topics";
import { authClient } from "@/lib/client/auth-client";
import { patchMe, refreshMe } from "@/lib/client/use-me";

const ZONES = [
  "Asia/Kolkata", "Asia/Dhaka", "Asia/Karachi", "Asia/Kathmandu", "Asia/Colombo", "Asia/Dubai", "Asia/Singapore",
  "Asia/Tokyo", "Australia/Sydney", "Europe/London", "Europe/Berlin", "Africa/Nairobi", "America/New_York",
  "America/Chicago", "America/Los_Angeles", "America/Toronto", "UTC",
];

type Follow = { targetType: "topic" | "entity" | "source"; targetSlug: string; muted: boolean };

function Section({ id, title, children, description }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid scroll-mt-28 gap-6 border-t border-rule py-10 md:grid-cols-12">
      <div className="md:col-span-4">
        <h2 id={`${id}-h`} className="hed hed-md">{title}</h2>
        {description && <p className="mt-2 max-w-[38ch] text-[0.9375rem] text-ink-muted">{description}</p>}
      </div>
      <div className="md:col-span-8">{children}</div>
    </section>
  );
}

export function SettingsPanel({
  settings,
  follows: initialFollows,
  emailAvailable,
  isAdmin,
}: {
  settings: { briefEnabled: boolean; briefHour: number; timezone: string };
  follows: Follow[];
  emailAvailable: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [follows, setFollows] = useState(initialFollows);
  const [brief, setBrief] = useState(settings);
  const [briefSaved, setBriefSaved] = useState(false);
  const [historyCleared, setHistoryCleared] = useState(false);

  const topicState = (slug: string): "follow" | "mute" | "none" => {
    const f = follows.find((x) => x.targetType === "topic" && x.targetSlug === slug);
    return !f ? "none" : f.muted ? "mute" : "follow";
  };

  async function setTopic(slug: string, next: "follow" | "mute" | "none") {
    const updated = follows.filter((x) => !(x.targetType === "topic" && x.targetSlug === slug));
    if (next !== "none") updated.push({ targetType: "topic", targetSlug: slug, muted: next === "mute" });
    setFollows(updated);
    patchMe((m) => ({ ...m, follows: updated }));
    await fetch("/api/v1/me/follows", {
      method: next === "none" ? "DELETE" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: "topic", targetSlug: slug, muted: next === "mute" }),
    });
  }

  async function unfollow(f: Follow) {
    const updated = follows.filter((x) => !(x.targetType === f.targetType && x.targetSlug === f.targetSlug));
    setFollows(updated);
    patchMe((m) => ({ ...m, follows: updated }));
    await fetch("/api/v1/me/follows", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
  }

  async function saveBrief(patch: Partial<typeof brief>) {
    const next = { ...brief, ...patch };
    setBrief(next);
    setBriefSaved(false);
    const res = await fetch("/api/v1/me/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
    setBriefSaved(res.ok);
  }

  async function signOut() {
    await authClient.signOut();
    await refreshMe();
    router.push("/");
    router.refresh();
  }

  const others = follows.filter((f) => f.targetType !== "topic");
  const zones = [...new Set([brief.timezone, ...ZONES])];

  return (
    <div className="mt-10">
      <Section id="follows" title="Sections" description="Followed sections rise up your front page. Hidden sections are left out of it.">
        <ul className="divide-y divide-rule border-y border-rule">
          {TOPICS.map((t) => {
            const s = topicState(t.slug);
            return (
              <li key={t.slug} className="flex items-center justify-between gap-4 py-3">
                <span className="text-[1rem] font-medium">{t.name}</span>
                <div className="inline-flex rounded-lg border border-rule p-0.5 text-[0.8125rem]" role="radiogroup" aria-label={`${t.name} preference`}>
                  {(["follow", "none", "mute"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={s === v}
                      onClick={() => setTopic(t.slug, v)}
                      className={`h-8 rounded-md px-3 transition-colors ${s === v ? (v === "mute" ? "bg-paper-sunk text-ink" : "bg-ink text-paper") : "text-ink-muted hover:text-ink"}`}
                    >
                      {v === "follow" ? "Follow" : v === "mute" ? "Hide" : "Default"}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section id="people" title="People, organisations and places" description="Follow them from any story’s “In this story” list.">
        {others.length === 0 ? (
          <p className="text-[0.9375rem] text-ink-muted">You’re not following anyone yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {others.map((f) => (
              <li key={`${f.targetType}-${f.targetSlug}`} className="inline-flex h-9 items-center gap-1 rounded-full border border-rule-strong pr-1 pl-4 text-[0.9375rem]">
                <Link href={f.targetType === "entity" ? `/e/${f.targetSlug}` : "/sources"} className="hover:text-pencil">
                  {f.targetSlug.replace(/-/g, " ")}
                </Link>
                <button type="button" onClick={() => unfollow(f)} className="grid size-7 place-items-center rounded-full text-ink-muted hover:bg-paper-sunk hover:text-ink" aria-label={`Unfollow ${f.targetSlug}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="brief" title="Daily brief" description="One email a day with the most-reported stories and what you follow.">
        {!emailAvailable && <p className="mb-4 text-[0.9375rem] text-ink-muted">Email isn’t configured on this deployment, so briefs can’t be sent yet.</p>}
        <label className="flex items-center gap-3 text-[1rem]">
          <input type="checkbox" checked={brief.briefEnabled} onChange={(e) => saveBrief({ briefEnabled: e.target.checked })} className="size-5 accent-[var(--pencil)]" />
          Send me the daily brief
        </label>
        <div className="mt-5 grid max-w-[520px] gap-4 sm:grid-cols-2">
          <label className="text-[0.875rem] font-medium">
            Time
            <select value={brief.briefHour} onChange={(e) => saveBrief({ briefHour: Number(e.target.value) })} disabled={!brief.briefEnabled} className="field mt-1.5">
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {new Date(2000, 0, 1, h).toLocaleTimeString("en-IN", { hour: "numeric", hour12: true })}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[0.875rem] font-medium">
            Time zone
            <select value={brief.timezone} onChange={(e) => saveBrief({ timezone: e.target.value })} disabled={!brief.briefEnabled} className="field mt-1.5">
              {zones.map((z) => (
                <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="meta mt-3 min-h-5" aria-live="polite">{briefSaved ? "Saved" : ""}</p>
      </Section>

      <Section id="data" title="Your data" description="Download everything Lede stores about you, or remove it.">
        <div className="flex flex-wrap gap-3">
          <a href="/api/v1/me/export" className="btn btn-secondary">Download my data</a>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              const r = await fetch("/api/v1/me/history", { method: "DELETE" });
              setHistoryCleared(r.ok);
            }}
          >
            {historyCleared ? "History cleared" : "Clear reading and Ask history"}
          </button>
        </div>
        <DeleteAccount />
      </Section>

      <Section id="account" title="Account">
        <div className="flex flex-wrap gap-3">
          {isAdmin && <Link href="/admin" className="btn btn-secondary">Open the admin console</Link>}
          <button type="button" onClick={signOut} className="btn btn-secondary">Sign out</button>
        </div>
      </Section>
    </div>
  );
}

function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="mt-6 text-[0.9375rem] text-danger underline underline-offset-4">Delete my account</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(20_22_26/0.4)]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-rule bg-paper-raised p-6">
          <Dialog.Title className="hed hed-md">Delete your account?</Dialog.Title>
          <Dialog.Description className="mt-3 text-[0.9375rem] text-ink-2">
            This permanently removes your account, saved stories, follows, reading history and Ask history. It can’t be undone.
          </Dialog.Description>
          <label className="mt-5 block text-[0.875rem] font-medium">
            Type <span className="font-semibold">delete</span> to confirm
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field mt-1.5" autoComplete="off" />
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close className="btn btn-quiet">Keep my account</Dialog.Close>
            <button
              type="button"
              disabled={confirm.trim().toLowerCase() !== "delete" || busy}
              onClick={async () => {
                setBusy(true);
                const r = await fetch("/api/v1/me", { method: "DELETE" });
                if (r.ok) {
                  await authClient.signOut().catch(() => {});
                  await refreshMe();
                  router.push("/");
                  router.refresh();
                } else setBusy(false);
              }}
              className="btn bg-danger text-white hover:opacity-90"
            >
              {busy ? "Deleting…" : "Delete account"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
