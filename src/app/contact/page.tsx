import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/ui/legal-page";
import { contactEmail } from "@/lib/env";

export const metadata: Metadata = {
  title: "Contact and corrections",
  description: "How to report a mistake, ask about your data, or request changes to the sources Lede uses.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const email = contactEmail();
  return (
    <LegalPage
      title="Contact and corrections"
      intro={
        <>
          Write to <a href={`mailto:${email}`} className="text-pencil underline underline-offset-4">{email}</a>. We aim to reply within a few days.
        </>
      }
      updated={null}
    >
      <h2 id="corrections">Reporting a mistake</h2>
      <p>
        The fastest way is the Report a problem button on the story itself. It sends the story to an editor along with the reason you
        choose. If you prefer email, include:
      </p>
      <ul>
        <li>the link to the story on Lede,</li>
        <li>the line or headline that is wrong, quoted exactly,</li>
        <li>the source that shows the correct information, if you have one.</li>
      </ul>
      <p>When a summary is corrected it is rewritten from its sources; we don&rsquo;t silently change the reports themselves, because they belong to their publishers.</p>

      <h2 id="publishers">Publishers</h2>
      <p>
        If you run an outlet and want your feed added, removed, or shown differently, email us from an address at your domain. We
        stop collecting a feed on request, and remove its existing reports within a few days.
      </p>

      <h2 id="data">Your data</h2>
      <p>
        You can download or delete your data yourself from <Link href="/settings">Settings</Link>. For anything else about your
        personal data, including grievances, write to the address above. The <Link href="/privacy">privacy policy</Link> explains
        what we hold.
      </p>

      <h2 id="security">Security</h2>
      <p>
        If you find a security problem, please report it privately to the address above rather than publicly. Our{" "}
        <a href="/.well-known/security.txt">security.txt</a> has the details.
      </p>
    </LegalPage>
  );
}
