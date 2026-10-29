import { readFile } from "node:fs/promises";
import path from "node:path";

const dir = path.join(process.cwd(), "node_modules/@fontsource/instrument-sans/files");

export async function ogFonts() {
  const [regular, bold] = await Promise.all([
    readFile(path.join(dir, "instrument-sans-latin-400-normal.woff")),
    readFile(path.join(dir, "instrument-sans-latin-700-normal.woff")),
  ]);
  return [
    { name: "Instrument Sans", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Instrument Sans", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

export const OG = { paper: "#f6f6f3", ink: "#1d2025", muted: "#5f646d", rule: "#d9dad4", pencil: "#2745c0" };

export function OgWordmark({ size = 44 }: { size?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: size, fontWeight: 700, letterSpacing: "-0.03em", color: OG.ink, lineHeight: 1 }}>Lede</div>
      <svg width={size * 1.6} height={size * 0.2} viewBox="0 0 64 8" preserveAspectRatio="none" style={{ marginTop: size * 0.08 }}>
        <path d="M1.5 5.2C14 3.4 30 2.6 46 3.1c6 .2 11 .7 16.5 1.6" fill="none" stroke={OG.pencil} strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function OgStrip({ count, height = 40 }: { count: number; height?: number }) {
  const n = Math.max(1, Math.min(count, 24));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ width: 10, height: i === 0 ? height : height - 10, borderRadius: 2, background: i === 0 ? OG.pencil : "#9da0a6" }} />
      ))}
    </div>
  );
}
