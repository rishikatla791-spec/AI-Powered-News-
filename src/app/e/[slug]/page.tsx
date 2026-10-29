import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEntity } from "@/lib/services/stories";
import { load } from "@/lib/services/safe";
import { StandardStory } from "@/components/story/story-block";
import { FollowButton } from "@/components/story/story-actions";
import { ErrorNotice, SetupNotice } from "@/components/ui/notice";
import { formatDate } from "@/lib/format";

export const revalidate = 300;
export const generateStaticParams = async () => [];
type Props = { params: Promise<{ slug: string }> };

const KIND = { person: "Person", org: "Organisation", place: "Place", event: "Event" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await load(() => getEntity(slug));
  const name = res.ok && res.data ? res.data.entity.name : "Not found";
  return { title: name, description: `Recent stories that mention ${name}, grouped across outlets.` };
}

export default async function EntityPage({ params }: Props) {
  const { slug } = await params;
  const res = await load(() => getEntity(slug));
  if (!res.ok) return res.reason === "unconfigured" ? <SetupNotice /> : <ErrorNotice />;
  if (!res.data) notFound();
  const { entity, stories } = res.data;

  // Group by day to read as a timeline of mentions.
  const days = new Map<string, typeof stories>();
  for (const s of stories) {
    const key = formatDate(s.lastUpdatedAt, { weekday: "long", day: "numeric", month: "long" });
    days.set(key, [...(days.get(key) ?? []), s]);
  }

  return (
    <div className="shell pt-10 md:pt-14">
      <header className="flex flex-col gap-5 border-b border-rule pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="meta">{KIND[entity.type]}</p>
          <h1 className="hed hed-xl mt-2">{entity.name}</h1>
          <p className="meta mt-3">
            Mentioned in {stories.length} {stories.length === 1 ? "story" : "stories"} recently
          </p>
        </div>
        <FollowButton type="entity" slug={entity.slug} label={entity.name} />
      </header>
      <div className="mt-4">
        {[...days.entries()].map(([day, list]) => (
          <section key={day} className="grid gap-6 border-b border-rule py-8 md:grid-cols-12">
            <h2 className="text-[0.9375rem] font-semibold md:col-span-3">{day}</h2>
            <div className="space-y-8 md:col-span-9">
              {list.map((s) => (
                <StandardStory key={s.id} story={s} withImage={Boolean(s.leadImageUrl)} showTopic />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
