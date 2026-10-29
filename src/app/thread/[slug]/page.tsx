import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getThread } from "@/lib/services/stories";
import { load } from "@/lib/services/safe";
import { ThreadTimeline } from "@/components/story/thread-timeline";
import { ErrorNotice, SetupNotice } from "@/components/ui/notice";
import { formatDate } from "@/lib/format";

export const revalidate = 300;
export const generateStaticParams = async () => [];
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await load(() => getThread(slug));
  return { title: res.ok && res.data ? res.data.thread.title : "Thread" };
}

export default async function ThreadPage({ params }: Props) {
  const { slug } = await params;
  const res = await load(() => getThread(slug));
  if (!res.ok) return res.reason === "unconfigured" ? <SetupNotice /> : <ErrorNotice />;
  if (!res.data) notFound();
  const { thread, stories } = res.data;
  return (
    <div className="shell grid gap-12 pt-10 md:pt-14 lg:grid-cols-12">
      <header className="lg:col-span-4">
        <p className="meta">Continuing coverage</p>
        <h1 className="hed hed-xl mt-2">{thread.title}</h1>
        <p className="dek mt-4">
          {stories.length} stories since {formatDate(thread.startedAt, { day: "numeric", month: "long" })}, oldest first.
        </p>
      </header>
      <div className="lg:col-span-8 lg:pt-3">
        <ThreadTimeline
          items={stories.map((s) => ({ id: s.id, slug: s.slug, headline: s.headline, firstSeenAt: s.firstSeenAt.toISOString(), outletCount: s.outletCount, current: false }))}
        />
      </div>
    </div>
  );
}
