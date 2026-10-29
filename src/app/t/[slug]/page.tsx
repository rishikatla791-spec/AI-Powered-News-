import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTopicStories } from "@/lib/services/stories";
import { load } from "@/lib/services/safe";
import { TOPICS, isTopic, topicName } from "@/lib/topics";
import { FeatureStory, StandardStory } from "@/components/story/story-block";
import { FollowButton } from "@/components/story/story-actions";
import { Reveal } from "@/components/motion/reveal";
import { ErrorNotice, SetupNotice } from "@/components/ui/notice";
import { KeyboardNav } from "@/components/story/keyboard-nav";

export const revalidate = 120;
export const dynamicParams = false;
export const generateStaticParams = () => TOPICS.map((t) => ({ slug: t.slug }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: topicName(slug), description: `${topicName(slug)} stories from the past week, grouped across outlets with cited summaries.`, alternates: { canonical: `/t/${slug}` } };
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  if (!isTopic(slug)) notFound();
  const res = await load(() => getTopicStories(slug));
  if (!res.ok) return res.reason === "unconfigured" ? <SetupNotice /> : <ErrorNotice />;
  const list = res.data;
  const withImages = list.filter((s) => s.leadImageUrl && s.outletCount > 1).slice(0, 2);
  const rest = list.filter((s) => !withImages.includes(s));
  const name = topicName(slug);

  return (
    <div className="shell pt-10 md:pt-14">
      <KeyboardNav />
      <header className="flex flex-col gap-5 border-b border-rule pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="hed hed-xl">{name}</h1>
          <p className="meta mt-3">
            {list.length} {list.length === 1 ? "story" : "stories"} from the past seven days, most widely reported first
          </p>
        </div>
        <FollowButton type="topic" slug={slug} label={name} />
      </header>

      {list.length === 0 ? (
        <p className="prose-read py-16">No {name.toLowerCase()} stories in the past week yet. Feeds are checked every 30 minutes.</p>
      ) : (
        <>
          {withImages.length > 0 && (
            <section className="grid gap-10 py-10 md:grid-cols-2 md:gap-12" aria-label={`Top ${name} stories`}>
              {withImages.map((s, i) => (
                <Reveal key={s.id} delay={i * 0.06}>
                  <FeatureStory story={s} priority={i === 0} />
                </Reveal>
              ))}
            </section>
          )}
          <section aria-label={`More ${name} stories`} className="grid gap-x-12 border-t border-rule md:grid-cols-2">
            {rest.map((s) => (
              <div key={s.id} className="border-b border-rule py-7">
                <StandardStory story={s} withImage={Boolean(s.leadImageUrl)} />
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
