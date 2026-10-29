import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell py-24">
      <div className="max-w-[56ch]">
        <p className="meta">Page not found</p>
        <h1 className="hed hed-xl mt-3">This page isn’t in today’s edition</h1>
        <p className="prose-read mt-5">
          The link may be mistyped, or the story may have been merged into a larger one or removed after 45 days. Search for it, or start
          from the front page.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary">Go to the front page</Link>
          <Link href="/search" className="btn btn-secondary">Search stories</Link>
        </div>
      </div>
    </div>
  );
}
