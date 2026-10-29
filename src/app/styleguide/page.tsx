import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LogoMark, Wordmark } from "@/components/brand/wordmark";
import { CoverageStrip } from "@/components/story/coverage-strip";
import { CompactStory, DevelopingMark, FeatureStory, LeadStory, StandardStory } from "@/components/story/story-block";
import { Notice } from "@/components/ui/notice";
import { getFrontPage, type StoryCard } from "@/lib/services/stories";

export const metadata: Metadata = { title: "Styleguide", robots: { index: false } };
export const dynamic = "force-dynamic";

const COLORS = [
  ["paper", "Page background"],
  ["paper-raised", "Cards, inputs"],
  ["paper-sunk", "Hover wells"],
  ["ink", "Headlines, primary text"],
  ["ink-2", "Reading text"],
  ["ink-muted", "Meta, captions"],
  ["rule", "Hairlines"],
  ["rule-strong", "Field borders"],
  ["pencil", "Citations, links, first reporter"],
  ["pencil-soft", "Focus ring, citation wash"],
  ["highlight", "Source being checked"],
  ["developing", "Developing stories"],
  ["danger", "Errors"],
] as const;

const TYPE = [
  ["hed hed-xl", "Lead headline", "Spain high-speed train collision near Toledo kills at least 69"],
  ["hed hed-lg", "Page and section titles", "What we know about the Toledo collision"],
  ["hed hed-md", "Feature headlines", "Bank of England holds rates as inflation stays above target"],
  ["hed hed-sm", "Standard headlines", "Cyclone Arnab: Andhra orders fast-track relief"],
  ["dek", "Dek (Newsreader)", "Investigators are examining signalling records from the control centre as the death toll rose overnight."],
  ["prose-read", "Reading text", "Reports differ on how many carriages derailed. Two outlets cite the regional government; a third cites the rail operator."],
  ["meta", "Meta and timestamps", "Updated 12 min ago · 9 outlets · 25 reports"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-rule py-12 md:py-16">
      <h2 className="hed hed-md mb-8">{title}</h2>
      {children}
    </section>
  );
}

async function sampleStories(): Promise<StoryCard[]> {
  try {
    return (await getFrontPage({ limit: 12 })).stories;
  } catch {
    return [];
  }
}

/** Dev-only reference for every token and component, rendered with real stories when the database has them. */
export default async function StyleguidePage() {
  if (process.env.NODE_ENV === "production") notFound();
  const stories = await sampleStories();
  const [lead, feature, ...rest] = stories;
  const outlets = stories.find((s) => s.outlets.length >= 6)?.outlets ?? ["The Hindu", "BBC News", "Reuters", "Al Jazeera", "NDTV", "The Guardian"];

  return (
    <div className="shell py-12 md:py-16">
      <p className="meta">Development only · not served in production</p>
      <h1 className="hed hed-xl mt-3">Styleguide</h1>
      <p className="dek mt-4 max-w-[60ch]">
        The editor’s desk: graphite ink on proof paper, one blue pencil, one highlighter. Switch light and dark from the reader settings in the
        masthead to check both themes.
      </p>
      <nav className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[0.9375rem]">
        {["colour", "type", "brand", "controls", "signature", "stories", "notices"].map((id) => (
          <a key={id} href={`#${id}`} className="link-draw capitalize text-ink-2">
            {id}
          </a>
        ))}
      </nav>

      <Section id="colour" title="Colour">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {COLORS.map(([token, use]) => (
            <div key={token}>
              <div className="h-16 rounded-md border border-rule" style={{ background: `var(--${token})` }} />
              <p className="mt-2 text-[0.875rem] font-medium">--{token}</p>
              <p className="meta">{use}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="type" title="Type">
        <div className="divide-y divide-rule">
          {TYPE.map(([cls, label, sample]) => (
            <div key={cls} className="grid gap-2 py-6 md:grid-cols-[12rem_1fr] md:gap-8">
              <div>
                <p className="text-[0.875rem] font-medium">{label}</p>
                <p className="meta">.{cls.replace(" ", " .")}</p>
              </div>
              <p className={cls}>{sample}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="brand" title="Brand">
        <div className="flex flex-wrap items-end gap-10">
          <Wordmark />
          <Wordmark compact />
          <LogoMark size={48} />
          <LogoMark size={32} />
        </div>
      </Section>

      <Section id="controls" title="Controls">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary">Primary</button>
            <button className="btn btn-secondary">Secondary</button>
            <button className="btn btn-quiet">Quiet</button>
            <button className="btn btn-primary" disabled>
              Disabled
            </button>
          </div>
          <div className="max-w-[360px]">
            <label htmlFor="sg-field" className="block text-[0.875rem] font-medium">
              Email
            </label>
            <input id="sg-field" className="field mt-1.5" placeholder="you@example.com" />
            <p className="meta mt-2">Focus shows the blue-pencil ring.</p>
          </div>
          <p className="prose-read">
            A <a className="link-draw text-pencil">drawn link</a> underlines from the left on hover. A{" "}
            <span className="highlighter" data-active="true">
              highlighted passage
            </span>{" "}
            marks the source a reader is checking.
          </p>
        </div>
      </Section>

      <Section id="signature" title="Coverage strip">
        <div className="grid gap-6">
          <CoverageStrip outlets={outlets.slice(0, 1)} />
          <CoverageStrip outlets={outlets.slice(0, 2)} />
          <CoverageStrip outlets={outlets} />
          <CoverageStrip outlets={outlets} size="md" />
          <span className="inline-flex items-center gap-2">
            <DevelopingMark /> <span className="meta">Developing</span>
          </span>
        </div>
      </Section>

      <Section id="stories" title="Story blocks">
        {lead ? (
          <div className="grid gap-12">
            <LeadStory story={lead} />
            {feature && (
              <div className="max-w-[640px]">
                <FeatureStory story={feature} />
              </div>
            )}
            <div className="grid gap-8 md:grid-cols-3">
              {rest.slice(0, 3).map((s) => (
                <StandardStory key={s.id} story={s} withImage />
              ))}
            </div>
            <ol className="max-w-[560px]">
              {rest.slice(3, 8).map((s, i) => (
                <li key={s.id}>
                  <CompactStory story={s} index={i + 1} />
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-ink-2">No stories in the database yet. Run the worker to see story blocks with real headlines.</p>
        )}
      </Section>

      <Section id="notices" title="Notices">
        <div className="max-w-[560px]">
          <Notice title="Lede is gathering the first edition">Reports are being collected. Stories appear once two or more outlets cover the same event.</Notice>
        </div>
      </Section>
    </div>
  );
}
