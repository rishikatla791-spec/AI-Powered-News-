import Link from "next/link";
import { getFrontPage } from "@/lib/services/stories";
import { load } from "@/lib/services/safe";
import { composeFrontPage, type FrontSection } from "@/lib/front-layout";
import { editionDate, formatTime, plural } from "@/lib/format";
import { CompactStory, FeatureStory, LeadStory, StandardStory } from "@/components/story/story-block";
import { Reveal } from "@/components/motion/reveal";
import { ErrorNotice, GatheringNotice, SetupNotice } from "@/components/ui/notice";
import { ForYou } from "@/components/story/for-you";
import { KeyboardNav } from "@/components/story/keyboard-nav";

export const revalidate = 120;

export default async function FrontPage() {
  const res = await load(() => getFrontPage());
  if (!res.ok) return res.reason === "unconfigured" ? <SetupNotice /> : <ErrorNotice />;
  const { stories, stats } = res.data;
  if (stories.length === 0) return <GatheringNotice />;
  const layout = composeFrontPage(stories);

  return (
    <div className="shell">
      <KeyboardNav />
      <EditionLine stats={stats} />

      {layout.lead && (
        <section aria-label="Lead story" className="grid gap-10 pt-6 pb-14 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-9">
            <LeadStory story={layout.lead} />
          </div>
          {layout.developing.length > 0 && (
            <aside aria-labelledby="rail-title" className="border-t border-rule pt-6 lg:col-span-3 lg:border-t-0 lg:border-l lg:pt-1 lg:pl-8">
              <h2 id="rail-title" className="text-[0.9375rem] font-semibold">
                {layout.railTitle}
              </h2>
              <ol className="mt-5 space-y-6">
                {layout.developing.map((s, i) => (
                  <Reveal as="li" key={s.id} delay={0.25 + i * 0.06}>
                    <CompactStory story={s} />
                  </Reveal>
                ))}
              </ol>
            </aside>
          )}
        </section>
      )}

      <ForYou />

      {layout.features.length > 0 && (
        <section aria-label="Top stories" className="grid gap-10 border-t border-rule pt-10 pb-14 md:grid-cols-2 md:gap-12">
          {layout.features.map((s, i) => (
            <Reveal key={s.id} delay={i * 0.08}>
              <FeatureStory story={s} />
            </Reveal>
          ))}
        </section>
      )}

      {layout.alsoToday.length > 0 && (
        <section aria-label="Also today" className="grid gap-10 border-t border-rule pt-10 pb-14 md:grid-cols-3 md:gap-10">
          {layout.alsoToday.map((s, i) => (
            <Reveal key={s.id} delay={i * 0.06}>
              <StandardStory story={s} showTopic />
            </Reveal>
          ))}
        </section>
      )}

      {layout.sections.map((section) => (
        <TopicSection key={section.topic} section={section} />
      ))}

      {layout.justIn.length > 0 && (
        <section aria-labelledby="just-in" className="border-t border-rule pt-10 pb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="just-in" className="hed hed-md">
              Just in
            </h2>
            <p className="meta max-w-[52ch]">Reported by one outlet so far. These get a summary once another outlet confirms them.</p>
          </div>
          <ul className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {layout.justIn.map((s) => (
              <li key={s.id}>
                <CompactStory story={s} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function EditionLine({ stats }: { stats: Awaited<ReturnType<typeof getFrontPage>>["stats"] }) {
  return (
    <div className="flex flex-col gap-1 border-b border-rule py-5 sm:flex-row sm:items-baseline sm:justify-between">
      <p className="text-[0.9375rem] font-medium">{editionDate()}</p>
      <p className="meta">
        {stats.lastUpdated ? `Updated ${formatTime(stats.lastUpdated)} IST, ` : ""}
        {plural(stats.articles24h, "report")} from {plural(stats.outlets24h, "outlet")} in the last 24 hours
      </p>
    </div>
  );
}

function TopicSection({ section }: { section: FrontSection }) {
  const [first, ...rest] = section.stories;
  if (!first) return null;
  return (
    <section aria-labelledby={`sec-${section.topic}`} className="border-t border-rule pt-8 pb-14">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`sec-${section.topic}`} className="hed hed-lg">
          <Link href={`/t/${section.topic}`} className="hover:text-pencil">
            {section.name}
          </Link>
        </h2>
        <Link href={`/t/${section.topic}`} className="link-draw text-[0.9375rem] text-ink-muted hover:text-ink">
          More in {section.name}
        </Link>
      </div>

      {section.variant === "row" ? (
        <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {section.stories.map((s, i) => (
            <Reveal key={s.id} delay={i * 0.05}>
              <StandardStory story={s} />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          <Reveal className={`lg:col-span-7 ${section.variant === "feature-right" ? "lg:order-2" : ""}`}>
            <FeatureStory story={first} />
          </Reveal>
          <div className={`space-y-8 lg:col-span-5 ${section.variant === "feature-right" ? "lg:order-1 lg:border-r lg:pr-10" : "lg:border-l lg:pl-10"} border-rule`}>
            {rest.map((s, i) => (
              <Reveal key={s.id} delay={0.05 + i * 0.05}>
                <StandardStory story={s} withImage={i === 0} />
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
