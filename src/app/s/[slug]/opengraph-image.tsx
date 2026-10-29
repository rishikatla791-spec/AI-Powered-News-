import { ImageResponse } from "next/og";
import { getStory } from "@/lib/services/stories";
import { topicName } from "@/lib/topics";
import { OG, OgStrip, OgWordmark, ogFonts } from "@/lib/og/brand";

export const runtime = "nodejs";
export const alt = "Story on Lede";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let headline = "The news, checked against itself.";
  let outlets = 0;
  let topic: string | null = null;
  try {
    const story = await getStory(slug);
    if (story) {
      headline = story.headline;
      outlets = new Set(story.coverage.map((c) => c.outlet)).size;
      topic = topicName(story.topicSlug);
    }
  } catch {
    /* no database: generic card */
  }
  const fontSize = headline.length > 80 ? 60 : headline.length > 50 ? 70 : 82;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: OG.paper, padding: "72px 80px", fontFamily: "Instrument Sans" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {topic && <div style={{ fontSize: 28, color: OG.muted }}>{topic}</div>}
          <div style={{ fontSize, fontWeight: 700, color: OG.ink, letterSpacing: "-0.02em", lineHeight: 1.04, maxWidth: 1040 }}>{headline}</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderTop: `2px solid ${OG.rule}`, paddingTop: 32 }}>
          <OgWordmark size={52} />
          {outlets > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <OgStrip count={outlets} height={34} />
              <div style={{ fontSize: 28, color: OG.muted }}>{`Reported by ${outlets} ${outlets === 1 ? "outlet" : "outlets"}`}</div>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
