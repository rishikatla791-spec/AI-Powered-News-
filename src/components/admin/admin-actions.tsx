"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SourceToggle({ id, active }: { id: string; active: boolean }) {
  const [on, setOn] = useState(active);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={on ? "Pause this source" : "Resume this source"}
      onClick={async () => {
        setOn(!on);
        const r = await fetch(`/api/v1/admin/sources/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: !on }) });
        if (!r.ok) setOn(on);
      }}
      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${on ? "bg-pencil" : "bg-rule-strong"}`}
    >
      <span className={`size-5 rounded-full bg-paper-raised shadow transition-transform ${on ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
    </button>
  );
}

export function FlagActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function set(status: "resolved" | "dismissed") {
    setBusy(true);
    await fetch(`/api/v1/admin/flags/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    router.refresh();
  }
  return (
    <div className="flex shrink-0 gap-2">
      <button type="button" disabled={busy} onClick={() => set("resolved")} className="btn btn-secondary h-8 text-[0.875rem]">Mark fixed</button>
      <button type="button" disabled={busy} onClick={() => set("dismissed")} className="btn btn-quiet h-8 text-[0.875rem]">Dismiss</button>
    </div>
  );
}
