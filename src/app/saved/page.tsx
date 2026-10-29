import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getSaved } from "@/lib/services/reader";
import { load } from "@/lib/services/safe";
import { StandardStory } from "@/components/story/story-block";
import { ErrorNotice } from "@/components/ui/notice";

export const metadata: Metadata = { title: "Saved stories", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="shell pt-14">
        <h1 className="hed hed-xl">Saved stories</h1>
        <p className="prose-read mt-5 max-w-[52ch]">
          Sign in to keep stories to read later. They stay saved on any device, and are kept even after a story leaves the front page.
        </p>
        <Link href="/sign-in?next=/saved" className="btn btn-primary mt-6">Sign in</Link>
      </div>
    );
  }
  const res = await load(() => getSaved(user.id));
  if (!res.ok) return <ErrorNotice what="your saved stories" />;
  return (
    <div className="shell pt-10 md:pt-14">
      <h1 className="hed hed-xl">Saved stories</h1>
      <p className="meta mt-3">{res.data.length} saved, newest first</p>
      {res.data.length === 0 ? (
        <p className="prose-read mt-10 max-w-[52ch]">
          Nothing saved yet. Use <span className="font-sans font-medium text-ink">Save</span> on any story and it will appear here.
        </p>
      ) : (
        <ol className="mt-6 grid gap-x-12 border-t border-rule md:grid-cols-2">
          {res.data.map((s) => (
            <li key={s.id} className="border-b border-rule py-7">
              <StandardStory story={s} withImage={Boolean(s.leadImageUrl)} showTopic />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
