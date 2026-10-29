"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="shell py-24">
      <div className="max-w-[56ch]">
        <h1 className="hed hed-xl">This page didn’t load</h1>
        <p className="prose-read mt-5">
          Something failed on our side while building it. Try again; if it keeps happening, the feed or database may be briefly unavailable.
          {error.digest ? ` Reference: ${error.digest}.` : ""}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
          <Link href="/" className="btn btn-secondary">Go to the front page</Link>
        </div>
      </div>
    </div>
  );
}
