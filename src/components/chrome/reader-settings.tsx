"use client";

import { useState } from "react";
import { useClientValue } from "@/lib/client/use-client-value";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "system" | "light" | "dark";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: settings apply for this visit only */
  }
}

export function applyTheme(next: Theme, origin?: { x: number; y: number }) {
  const root = document.documentElement;
  const set = () => {
    if (next === "system") delete root.dataset.theme;
    else root.dataset.theme = next;
  };
  const reduced = root.dataset.motion === "reduced" || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || reduced || !origin) return set();
  const t = doc.startViewTransition(set);
  const r = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
  void t.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${r}px at ${origin.x}px ${origin.y}px)`] },
      { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
    );
  });
}

const SCALES = [
  { value: "0.9375", label: "Smaller text" },
  { value: "1", label: "Default text size" },
  { value: "1.0625", label: "Larger text" },
  { value: "1.125", label: "Largest text" },
];

export function ReaderSettings() {
  const storedTheme = useClientValue<Theme>(() => {
    const t = read("lede-theme");
    return t === "light" || t === "dark" ? t : "system";
  }, "system");
  const storedScale = useClientValue(() => read("lede-scale") ?? "1", "1");
  const storedReduced = useClientValue(() => read("lede-motion") === "reduced", false);
  const [themeChoice, setTheme] = useState<Theme | null>(null);
  const [scaleChoice, setScale] = useState<string | null>(null);
  const [reducedChoice, setReduced] = useState<boolean | null>(null);
  const theme = themeChoice ?? storedTheme;
  const scale = scaleChoice ?? storedScale;
  const reduced = reducedChoice ?? storedReduced;

  function chooseTheme(next: Theme, e: React.MouseEvent) {
    setTheme(next);
    write("lede-theme", next === "system" ? null : next);
    applyTheme(next, { x: e.clientX, y: e.clientY });
  }
  function chooseScale(v: string) {
    setScale(v);
    write("lede-scale", v === "1" ? null : v);
    document.documentElement.style.setProperty("--reader-scale", v);
  }
  function toggleMotion() {
    const next = !reduced;
    setReduced(next);
    write("lede-motion", next ? "reduced" : null);
    if (next) document.documentElement.dataset.motion = "reduced";
    else delete document.documentElement.dataset.motion;
  }

  const themes: { v: Theme; label: string; icon: React.ReactNode }[] = [
    { v: "system", label: "Match device", icon: <Monitor size={16} strokeWidth={1.75} /> },
    { v: "light", label: "Light", icon: <Sun size={16} strokeWidth={1.75} /> },
    { v: "dark", label: "Dark", icon: <Moon size={16} strokeWidth={1.75} /> },
  ];

  return (
    <div className="mt-8 space-y-4">
      <fieldset>
        <legend className="text-[0.875rem] font-semibold">Appearance</legend>
        <div className="mt-2 inline-flex rounded-lg border border-rule p-0.5" role="radiogroup" aria-label="Colour theme">
          {themes.map((t) => (
            <button
              key={t.v}
              type="button"
              role="radio"
              aria-checked={theme === t.v}
              aria-label={t.label}
              title={t.label}
              onClick={(e) => chooseTheme(t.v, e)}
              className={`grid h-8 w-10 place-items-center rounded-md transition-colors ${
                theme === t.v ? "bg-paper-raised text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Text size">
          {SCALES.map((s, i) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={scale === s.value}
              aria-label={s.label}
              title={s.label}
              onClick={() => chooseScale(s.value)}
              className={`grid h-8 w-8 place-items-center rounded-md font-serif transition-colors ${
                scale === s.value ? "bg-ink text-paper" : "text-ink-muted hover:bg-paper-sunk hover:text-ink"
              }`}
              style={{ fontSize: `${0.8 + i * 0.12}rem` }}
            >
              A
            </button>
          ))}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[0.875rem] text-ink-2">
          <input type="checkbox" checked={reduced} onChange={toggleMotion} className="size-4 accent-[var(--pencil)]" />
          Reduce motion
        </label>
      </div>
    </div>
  );
}
