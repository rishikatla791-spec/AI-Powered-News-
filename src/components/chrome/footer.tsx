import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { TOPICS } from "@/lib/topics";
import { ReaderSettings } from "./reader-settings";

const groups = [
  {
    title: "Read",
    links: [
      { href: "/", label: "Front page" },
      { href: "/search", label: "Search" },
      { href: "/ask", label: "Ask the news" },
      { href: "/saved", label: "Saved stories" },
    ],
  },
  {
    title: "How Lede works",
    links: [
      { href: "/methodology", label: "Methodology" },
      { href: "/sources", label: "Sources and feed status" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact and corrections" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms and conditions" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-rule bg-paper-sunk/60">
      <div className="shell grid gap-12 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Wordmark />
          <p className="dek mt-5 max-w-[34ch] text-[1.0625rem]">
            Reporting from many outlets, grouped into single stories and summarised with a source for every line.
          </p>
          <ReaderSettings />
        </div>
        <nav aria-label="Sections" className="md:col-span-2">
          <h2 className="text-[0.875rem] font-semibold text-ink">Sections</h2>
          <ul className="mt-3 space-y-2">
            {TOPICS.map((t) => (
              <li key={t.slug}>
                <Link href={`/t/${t.slug}`} className="link-draw text-[0.9375rem] text-ink-muted hover:text-ink">
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title} className="md:col-span-2">
            <h2 className="text-[0.875rem] font-semibold text-ink">{g.title}</h2>
            <ul className="mt-3 space-y-2">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-draw text-[0.9375rem] text-ink-muted hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="shell flex flex-col gap-2 border-t border-rule py-6 text-[0.8125rem] text-ink-muted md:flex-row md:justify-between">
        <p>Headlines and excerpts belong to their publishers. Every story links to the original reporting.</p>
        <p>© {new Date().getFullYear()} Lede</p>
      </div>
    </footer>
  );
}
