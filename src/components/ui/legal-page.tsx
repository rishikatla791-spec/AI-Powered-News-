/**
 * Long-form reading layout for the trust pages (privacy, terms, methodology,
 * about, contact). Optional contents column on wide screens.
 */
export function LegalPage({
  title,
  intro,
  updated = "29 October 2026",
  toc,
  draftNote,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  updated?: string | null;
  toc?: { id: string; label: string }[];
  draftNote?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="shell pt-12 pb-8 md:pt-16">
      <header className="max-w-[860px]">
        <h1 className="hed hed-xl">{title}</h1>
        {intro && <div className="dek mt-5 max-w-[60ch]">{intro}</div>}
        {updated && <p className="meta mt-5">Last updated {updated}</p>}
      </header>

      <div className={`mt-12 grid gap-12 ${toc?.length ? "lg:grid-cols-12" : ""}`}>
        {toc && toc.length > 0 && (
          <nav aria-label="On this page" className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-28">
              <p className="text-[0.875rem] font-semibold">On this page</p>
              <ol className="mt-3 space-y-2 border-l border-rule">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="-ml-px block border-l-2 border-transparent pl-4 text-[0.9375rem] text-ink-muted hover:border-pencil hover:text-ink">
                      {t.label}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>
        )}

        <div className={toc?.length ? "lg:col-span-8 lg:col-start-5" : "max-w-[720px]"}>
          {draftNote && (
            <p className="mb-10 rounded-md border border-rule bg-paper-sunk px-4 py-3 text-[0.9375rem] text-ink-2">{draftNote}</p>
          )}
          <div
            className={[
              "prose-read max-w-[68ch]",
              "[&_h2]:font-sans [&_h2]:[font-variation-settings:'wdth'_78] [&_h2]:font-[680] [&_h2]:text-[clamp(1.3rem,1.1rem+0.7vw,1.625rem)] [&_h2]:leading-[1.1] [&_h2]:tracking-[-0.012em] [&_h2]:mt-14 [&_h2]:mb-4 [&_h2]:scroll-mt-28 [&_h2]:text-ink first:[&_h2]:mt-0",
              "[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-sans [&_h3]:text-[1.0625rem] [&_h3]:font-semibold [&_h3]:text-ink",
              "[&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
              "[&_li]:pl-1 [&_li::marker]:text-ink-muted",
              "[&_a]:text-pencil [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-4 hover:[&_a]:decoration-2",
              "[&_strong]:font-semibold [&_strong]:text-ink",
              "[&_code]:rounded [&_code]:bg-paper-sunk [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-sans [&_code]:text-[0.9em]",
            ].join(" ")}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
