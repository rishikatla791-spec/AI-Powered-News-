"use client";
import { useEffect, useSyncExternalStore } from "react";

export type Me = {
  user: { id: string; name: string; email: string; isAdmin: boolean } | null;
  follows: { targetType: "topic" | "entity" | "source"; targetSlug: string; muted: boolean }[];
  bookmarks: string[];
  authAvailable: boolean;
  googleAvailable: boolean;
};

type Snapshot = { me: Me; loaded: boolean };

const EMPTY: Me = { user: null, follows: [], bookmarks: [], authAvailable: false, googleAvailable: false };
const SERVER: Snapshot = { me: EMPTY, loaded: false };

let snapshot: Snapshot = SERVER;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: Snapshot) {
  snapshot = next;
  for (const l of listeners) l();
}

export function refreshMe(): Promise<void> {
  inflight ??= fetch("/api/v1/me", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : EMPTY))
    .then((me: Me) => set({ me, loaded: true }))
    .catch(() => set({ me: EMPTY, loaded: true }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Optimistically update local state (e.g. after following). */
export function patchMe(fn: (m: Me) => Me) {
  set({ ...snapshot, me: fn(snapshot.me) });
}

/** The signed-in reader, shared across components and fetched once per page load. */
export function useMe(): Snapshot {
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
    () => SERVER,
  );
  useEffect(() => {
    if (!snapshot.loaded) void refreshMe();
  }, []);
  return snap;
}
