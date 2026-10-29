import Link from "next/link";
import type { StoryCard } from "@/lib/services/stories";
import { timeAgo } from "@/lib/format";
import { topicName } from "@/lib/topics";
import { truncate } from "@/lib/text";
import { CoverageStrip } from "./coverage-strip";
import { StoryImage } from "./story-image";
import { HeadlineReveal, ImageWipe } from "@/components/motion/reveal";

export function DevelopingMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-developing ${className}`}>
      <span className="relative flex size-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-developing/50 [animation-duration:2.4s]" />
        <span className="relative size-2 rounded-full bg-developing" />
      </span>
      Developing
    </span>
  );
}

function StoryMeta({ story, showTopic = false }: { story: StoryCard; showTopic?: boolean }) {
  return (
    <p className="meta flex flex-wrap items-center gap-x-3 gap-y-1">
      {story.status === "developing" && <DevelopingMark />}
      {showTopic && (
        <Link href={`/t/${story.topicSlug}`} className="relative z-10 font-medium text-ink-2 hover:text-pencil">
          {topicName(story.topicSlug)}
        </Link>
      )}
      <span>Updated {timeAgo(story.lastUpdatedAt)}</span>
    </p>
  );
}

const summaryLine = (s: StoryCard, max: number) => (s.keyPoint ? truncate(s.keyPoint, max) : s.dek ? truncate(s.dek, max) : null);

/** The lead story. Its headline is the page's one orchestrated entrance. */
export function LeadStory({ story }: { story: StoryCard }) {
  const points = story.keyPoints.slice(0, 3);
  return (
    <article className="story-link group relative">
      <StoryMeta story={story} showTopic />
      <Link href={`/s/${story.slug}`} className="mt-4 block after:absolute after:inset-0">
        <HeadlineReveal text={story.headline} className="hed hed-xl max-w-[22ch]" />
      </Link>
      <div className={`mt-8 grid gap-8 ${story.leadImageUrl ? "lg:grid-cols-12" : ""}`}>
        <div className={`flex flex-col ${story.leadImageUrl ? "lg:col-span-5" : "max-w-[68ch]"}`}>
          {points.length > 0 ? (
            <>
              <p className="text-[0.875rem] font-semibold">What we know</p>
              <ul className="prose-read mt-3 space-y-3 text-[1.0625rem] leading-[1.55]">
                {points.map((p, i) => (
                  <li key={i} className="relative pl-5">
                    <span aria-hidden className="absolute top-[0.7em] left-0 h-[2px] w-2.5 rounded-full bg-pencil" />
                    {truncate(p, 220)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            story.dek && <p className="dek">{truncate(story.dek, 260)}</p>
          )}
          <div className="mt-auto pt-6">
            <CoverageStrip outlets={story.outlets} size="md" />
          </div>
        </div>
        {story.leadImageUrl && (
          <div className="order-first lg:order-none lg:col-span-7">
            <ImageWipe>
              <StoryImage src={story.leadImageUrl} topic={story.topicSlug} ratio="16 / 10" priority />
            </ImageWipe>
          </div>
        )}
      </div>
    </article>
  );
}

export function FeatureStory({ story, priority = false }: { story: StoryCard; priority?: boolean }) {
  const line = summaryLine(story, 200);
  return (
    <article className="story-link group relative flex flex-col">
      {story.leadImageUrl && (
        <ImageWipe className="mb-4">
          <StoryImage src={story.leadImageUrl} topic={story.topicSlug} ratio="16 / 10" priority={priority} />
        </ImageWipe>
      )}
      <div>
        <StoryMeta story={story} showTopic />
      </div>
      <h2 className="hed hed-lg mt-2.5">
        <Link href={`/s/${story.slug}`} className="after:absolute after:inset-0">
          {story.headline}
        </Link>
      </h2>
      {line && <p className="dek mt-3 text-[1.0625rem]">{line}</p>}
      <div className="mt-4">
        <CoverageStrip outlets={story.outlets} />
      </div>
    </article>
  );
}

export function StandardStory({ story, withImage = false, showTopic = false }: { story: StoryCard; withImage?: boolean; showTopic?: boolean }) {
  const line = summaryLine(story, 150);
  return (
    <article className={`story-link group relative ${withImage && story.leadImageUrl ? "grid grid-cols-[1fr_112px] gap-4 sm:grid-cols-[1fr_148px]" : ""}`}>
      <div className="min-w-0">
        <StoryMeta story={story} showTopic={showTopic} />
        <h3 className="hed hed-md mt-2">
          <Link href={`/s/${story.slug}`} className="after:absolute after:inset-0">
            {story.headline}
          </Link>
        </h3>
        {line && <p className="prose-read mt-2 text-[1rem] leading-[1.5]">{line}</p>}
        <div className="mt-3">
          <CoverageStrip outlets={story.outlets} />
        </div>
      </div>
      {withImage && story.leadImageUrl && <StoryImage src={story.leadImageUrl} topic={story.topicSlug} ratio="1 / 1" className="self-start" />}
    </article>
  );
}

export function CompactStory({ story, index }: { story: StoryCard; index?: number }) {
  return (
    <article className="story-link group relative flex gap-4">
      {index !== undefined && <span className="hed w-5 shrink-0 pt-0.5 text-[1.125rem] text-ink-muted/60 num">{index}</span>}
      <div className="min-w-0">
        <h3 className="hed hed-sm">
          <Link href={`/s/${story.slug}`} className="after:absolute after:inset-0">
            {story.headline}
          </Link>
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <CoverageStrip outlets={story.outlets} showLabel={false} />
          <span className="meta">
            {story.outletCount} {story.outletCount === 1 ? "outlet" : "outlets"}, {timeAgo(story.lastUpdatedAt)}
          </span>
        </div>
      </div>
    </article>
  );
}
