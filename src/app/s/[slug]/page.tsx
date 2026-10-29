import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStory } from "@/lib/services/stories";
import { load } from "@/lib/services/safe";
import { formatDateTime, timeAgo } from "@/lib/format";
import { topicName } from "@/lib/topics";
import { DevelopingMark, StandardStory } from "@/components/story/story-block";
import { StoryBody } from "@/components/story/story-body";
import { StoryImage } from "@/components/story/story-image";
import { FollowButton, ListenButton, ReportButton, SaveButton, ShareButton } from "@/components/story/story-actions";
import { ThreadTimeline } from "@/components/story/thread-timeline";
import { HeadlineReveal, Reveal } from "@/components/motion/reveal";
import { ErrorNotice, SetupNotice } from "@/components/ui/notice";
import { ReadTracker } from "@/components/story/read-tracker";

export const revalidate = 120;
export const generateStaticParams = async () => [];

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await load(() => getStory(slug));
  if (!res.ok || !res.data) return { title: "Story" };
  const s = res.data;
  const description = s.summary?.whatWeKnow?.[0]?.text ?? s.dek ?? undefined;
  return {
    title: s.headline,
    description,
    alternates: { canonical: `/s/${s.slug}` },
    openGraph: { title: s.headline, description, type: "article", url: `/s/${s.slug}` },
  };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const res = await load(() => getStory(slug));
  if (!res.ok) return res.reason === "unconfigured" ? <SetupNotice /> : <ErrorNotice what="this story" />;
  const story = res.data;
  if (!story) notFound();

  const image = story.coverage.find((c) => c.imageUrl && c.imageUrl === story.leadImageUrl);
  const listenText = [story.headline, ...(story.summary?.whatWeKnow ?? []).map((b) => b.text)].join(". ");
  const outlets = new Set(story.coverage.map((c) => c.outlet)).size;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: story.headline,
    datePublished: story.firstSeenAt.toISOString(),
    dateModified: story.lastUpdatedAt.toISOString(),
    isBasedOn: story.coverage.slice(0, 10).map((c) => c.url),
  };

  return (
    <article className="shell pt-8 md:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ReadTracker storyId={story.id} />

      <header className="max-w-[1000px]">
        <p className="meta flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href={`/t/${story.topicSlug}`} className="font-medium text-ink-2 hover:text-pencil">
            {topicName(story.topicSlug)}
          </Link>
          {story.status === "developing" && <DevelopingMark />}
          <span>
            Updated <time dateTime={story.lastUpdatedAt.toISOString()} title={formatDateTime(story.lastUpdatedAt)}>{timeAgo(story.lastUpdatedAt)}</time>
          </span>
          {story.thread && (
            <Link href={`/thread/${story.thread.slug}`} className="text-pencil hover:underline">
              Part of: {story.thread.title}
            </Link>
          )}
        </p>
        <HeadlineReveal text={story.headline} className="hed hed-xl mt-4" />
        {story.dek && <p className="dek mt-5 max-w-[60ch] text-[1.25rem]">{story.dek}</p>}

        <div className="mt-7 flex flex-wrap items-center gap-2">
          <SaveButton storyId={story.id} />
          <FollowButton type="topic" slug={story.topicSlug} label={topicName(story.topicSlug)} />
          <ListenButton text={listenText} />
          <ShareButton title={story.headline} />
          <span className="ml-auto">
            <ReportButton storyId={story.id} />
          </span>
        </div>
      </header>

      {story.leadImageUrl && (
        <Reveal className="mt-10">
          <figure>
            <StoryImage src={story.leadImageUrl} topic={story.topicSlug} ratio="21 / 9" priority />
            {image && <figcaption className="meta mt-2">Image from {image.outlet}</figcaption>}
          </figure>
        </Reveal>
      )}

      <div className="mt-10">
        <StoryBody
          whatWeKnow={story.summary?.whatWeKnow ?? null}
          differences={story.summary?.differences ?? []}
          coverage={story.coverage.map((c) => ({ ...c, publishedAt: c.publishedAt.toISOString() }))}
          summaryMeta={
            story.summary
              ? { generatedAt: story.summaryGeneratedAt?.toISOString() ?? null, reports: story.summary.citedArticleIds.length }
              : null
          }
          outletCount={outlets}
        />
      </div>

      {story.entities.length > 0 && (
        <section aria-labelledby="in-story" className="mt-20 border-t border-rule pt-8">
          <h2 id="in-story" className="hed hed-md">
            In this story
          </h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {story.entities.map((e) => (
              <li key={e.slug}>
                <Link
                  href={`/e/${e.slug}`}
                  className="inline-flex h-9 items-center rounded-full border border-rule-strong px-4 text-[0.9375rem] text-ink-2 transition-colors hover:border-ink hover:text-ink"
                >
                  {e.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {story.thread && story.thread.stories.length > 1 && (
        <section aria-labelledby="thread" className="mt-20 grid gap-10 border-t border-rule pt-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="thread" className="hed hed-lg">
              How we got here
            </h2>
            <p className="dek mt-3 text-[1.0625rem]">Earlier stories about {story.thread.title}, oldest first.</p>
          </div>
          <div className="lg:col-span-8">
            <ThreadTimeline
              items={story.thread.stories.map((s) => ({
                id: s.id,
                slug: s.slug,
                headline: s.headline,
                firstSeenAt: s.firstSeenAt.toISOString(),
                outletCount: s.outletCount,
                current: s.id === story.id,
              }))}
            />
          </div>
        </section>
      )}

      {story.related.length > 0 && (
        <section aria-labelledby="related" className="mt-20 border-t border-rule pt-8">
          <h2 id="related" className="hed hed-lg">
            Related stories
          </h2>
          <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {story.related.map((s, i) => (
              <Reveal key={s.id} delay={i * 0.05}>
                <StandardStory story={s} showTopic />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
