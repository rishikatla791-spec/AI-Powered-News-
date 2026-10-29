import { ImageResponse } from "next/og";
import { OG, OgStrip, OgWordmark, ogFonts } from "@/lib/og/brand";

export const runtime = "nodejs";
export const alt = "Lede: the news, checked against itself";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: OG.paper, padding: 80, fontFamily: "Instrument Sans" }}>
        <OgWordmark size={120} />
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          <div style={{ fontSize: 60, fontWeight: 700, color: OG.ink, letterSpacing: "-0.02em", lineHeight: 1.05, maxWidth: 900 }}>
            The news, checked against itself.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <OgStrip count={12} />
            <div style={{ fontSize: 28, color: OG.muted }}>Many outlets, one story, every line sourced.</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
