import { DatabaseNotConfiguredError } from "@/lib/db";

export type Loaded<T> = { ok: true; data: T } | { ok: false; reason: "unconfigured" | "error"; message?: string };

/** Runs a data loader; distinguishes "not set up yet" from real failures so pages can say which. */
export async function load<T>(fn: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) return { ok: false, reason: "unconfigured" };
    console.error("[load]", err);
    return { ok: false, reason: "error", message: (err as Error).message };
  }
}
