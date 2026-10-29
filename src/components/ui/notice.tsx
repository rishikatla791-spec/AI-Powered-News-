import Link from "next/link";

/** Honest empty and error states: what happened, and what to do next. */
export function SetupNotice() {
  return (
    <Notice title="This edition hasn’t been published yet">
      <p>
        Lede is installed but not connected to its database, so there are no stories to show. Add a <code>DATABASE_URL</code> in
        the hosting settings and run the ingestion workflow once. The README lists every step.
      </p>
    </Notice>
  );
}

export function ErrorNotice({ what = "stories" }: { what?: string }) {
  return (
    <Notice title={`We couldn’t load ${what} just now`}>
      <p>The database didn’t respond. Reload in a moment; saved stories and settings are not affected.</p>
    </Notice>
  );
}

export function GatheringNotice() {
  return (
    <Notice title="The first edition is being gathered">
      <p>
        Feeds are checked every 30 minutes. Stories appear here once articles arrive, and summaries once at least two outlets
        report the same event. <Link href="/sources" className="text-pencil underline underline-offset-4">See feed status</Link>.
      </p>
    </Notice>
  );
}

export function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="shell py-24">
      <div className="max-w-[58ch]">
        <h1 className="hed hed-lg">{title}</h1>
        <div className="prose-read mt-5 space-y-4 [&_code]:rounded [&_code]:bg-paper-sunk [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-sans [&_code]:text-[0.9em]">
          {children}
        </div>
      </div>
    </div>
  );
}
