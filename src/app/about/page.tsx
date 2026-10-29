import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/ui/legal-page";

export const metadata: Metadata = {
  title: "About",
  description: "Why Lede exists, who makes it, and what it is not.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <LegalPage
      title="About Lede"
      intro="Most news events are reported by dozens of outlets at once. Lede puts those reports side by side, so you can see what they agree on, where they differ, and who said what."
      updated={null}
    >
      <h2 id="why">Why it exists</h2>
      <p>
        Reading one report tells you what one newsroom chose to say. Reading ten is more reliable but takes an afternoon. Lede does
        the gathering for you: it groups reports about the same event into a single story, shows how many outlets covered it and
        when, and writes a short summary in which every line links to the reports behind it.
      </p>
      <p>
        The aim is not to replace journalism but to make it easier to check. If a detail matters to you, the original report is one
        click away.
      </p>

      <h2 id="who">Who makes it</h2>
      <p>
        Lede is built and maintained by Mabbu Manohar, a full-stack developer based in India, as an independent project. There is no
        newsroom, no investors and no advertising. Corrections and feedback are read by the person who wrote the code.
      </p>

      <h2 id="not">What it isn’t</h2>
      <ul>
        <li>It is not a publisher. Lede doesn&rsquo;t do its own reporting or write news.</li>
        <li>It doesn&rsquo;t rate outlets for bias or reliability. It shows who reported what, and leaves the judgement to you.</li>
        <li>It doesn&rsquo;t decide what&rsquo;s true. A story reported by many outlets can still be wrong.</li>
      </ul>

      <h2 id="how">How it is built</h2>
      <p>
        Lede runs on Next.js and PostgreSQL, with pgvector for grouping and search. Summaries and answers use the free tiers of
        Google&rsquo;s Gemini and Groq. Every step, its thresholds and its limits are written up in the{" "}
        <Link href="/methodology">methodology</Link>, and the health of every feed is public on the{" "}
        <Link href="/sources">sources page</Link>.
      </p>

      <h2 id="contact">Get in touch</h2>
      <p>
        Spotted a mistake, or want your outlet added or removed? Use the <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
