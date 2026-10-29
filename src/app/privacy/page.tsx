import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/ui/legal-page";
import { contactEmail } from "@/lib/env";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Lede collects, why, how long it is kept, who processes it, and how to export or delete your data.",
  alternates: { canonical: "/privacy" },
};

const toc = [
  { id: "summary", label: "In short" },
  { id: "collect", label: "What we collect" },
  { id: "why", label: "Why we use it" },
  { id: "retention", label: "How long we keep it" },
  { id: "processors", label: "Services we rely on" },
  { id: "ai", label: "AI providers" },
  { id: "cookies", label: "Cookies and local storage" },
  { id: "rights", label: "Your rights" },
  { id: "children", label: "Age" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact and grievances" },
];

export default function PrivacyPage() {
  const email = contactEmail();
  return (
    <LegalPage
      title="Privacy policy"
      intro="You can read Lede without an account. If you create one, we keep the little we need to remember what you follow and save, and nothing else."
      toc={toc}
      draftNote="This policy is a draft written for this project and should be reviewed by a qualified lawyer before public launch."
    >
      <h2 id="summary">In short</h2>
      <ul>
        <li>No advertising, no selling or renting of data, and no third-party analytics or tracking scripts.</li>
        <li>Reading the site requires no account and stores nothing about you on our servers.</li>
        <li>An account holds your email address, your name, what you follow, what you save and, for 90 days, which stories you opened.</li>
        <li>You can download everything we hold about you, or delete your account, from Settings at any time.</li>
      </ul>

      <h2 id="collect">What we collect</h2>
      <h3>If you only read</h3>
      <p>
        Nothing is linked to you. To protect the service from abuse, our rate limiter counts requests from your network address for
        searches, questions and reports. Those counters expire on their own when the limit window ends (one minute to one day).
      </p>
      <h3>If you create an account</h3>
      <ul>
        <li>
          <strong>Account details:</strong> your email address and name. With Google sign-in we also receive your profile picture link
          and Google account identifier. With an email sign-in link we receive only the address you type.
        </li>
        <li>
          <strong>Your choices:</strong> the sections, people, places and outlets you follow or mute, the stories you save, and your
          daily brief settings (on or off, hour, time zone).
        </li>
        <li>
          <strong>Reading events:</strong> when you keep a story open for a few seconds we record the story and the time, so your
          personal feed can skip what you have already read.
        </li>
        <li>
          <strong>Questions you ask:</strong> when signed in, your Ask questions and the answers are kept so you can see your history.
          Questions asked while signed out are not stored.
        </li>
        <li>
          <strong>Session data:</strong> a session record with its expiry time, and the IP address and browser name sent with sign-in,
          used to keep you signed in and to spot misuse.
        </li>
      </ul>
      <h3>If you report a problem</h3>
      <p>
        We store the story, the reason you chose, any details you write and, if you are signed in, your account identifier so we can
        follow up.
      </p>

      <h2 id="why">Why we use it</h2>
      <ul>
        <li>To provide the features you ask for (following, saving, the daily brief, Ask history). This is the basis of your consent and of performing the service you signed up for.</li>
        <li>To keep the service working and safe, including rate limiting and investigating abuse. This is our legitimate interest in running a reliable free service.</li>
        <li>To send the sign-in links and, only if you turn it on, the daily brief.</li>
      </ul>
      <p>We do not use your data for advertising, profiling for third parties, or training AI models.</p>

      <h2 id="retention">How long we keep it</h2>
      <ul>
        <li>Account, follows, saved stories and settings: until you delete your account.</li>
        <li>Reading events: 90 days, then deleted automatically.</li>
        <li>Ask history: until you clear it in Settings or delete your account.</li>
        <li>Problem reports: until they are resolved and no longer needed, at most one year.</li>
        <li>Rate-limit counters: until the limit window ends, at most one day.</li>
        <li>News data (headlines, excerpts, links) is not personal data; stories are removed after about 45 days unless someone has saved them.</li>
        <li>Internal job logs, which contain no personal data: 14 days.</li>
      </ul>

      <h2 id="processors">Services we rely on</h2>
      <p>These companies process data on our behalf, only to run Lede:</p>
      <ul>
        <li><strong>Vercel</strong> hosts the website and API. Requests pass through its servers and edge network.</li>
        <li><strong>Neon</strong> hosts the PostgreSQL database where account data is stored.</li>
        <li><strong>Upstash</strong> stores the short-lived rate-limit counters, keyed by IP address or account identifier.</li>
        <li><strong>Resend</strong> delivers sign-in emails and the daily brief, so it receives your email address.</li>
        <li><strong>Google</strong> handles Google sign-in if you choose it.</li>
        <li><strong>GitHub</strong> runs the scheduled job that collects news feeds; it handles no reader data.</li>
      </ul>
      <p>Some of these providers store data outside India, including in the United States and the European Union.</p>

      <h2 id="ai">AI providers</h2>
      <p>
        Summaries, embeddings and Ask answers are produced with the <strong>Google Gemini API</strong> and, as a fallback,{" "}
        <strong>Groq</strong>. We send them article headlines, excerpts and, for Ask, the text of your question. We never send your
        email, name or account identifier.
      </p>
      <p>
        Lede uses the free tiers of these services. Free tiers may allow the provider to use submitted content to improve its
        products, so do not put personal information in Ask questions.
      </p>

      <h2 id="cookies">Cookies and local storage</h2>
      <p>
        We set one essential cookie when you sign in, to keep your session. There are no advertising or analytics cookies, so there
        is no consent banner. Reader preferences (theme, text size, reduced motion) are kept in your browser&rsquo;s local storage
        and never sent to us.
      </p>

      <h2 id="rights">Your rights</h2>
      <p>
        Under India&rsquo;s Digital Personal Data Protection Act, 2023, and, where it applies, the EU General Data Protection
        Regulation, you can:
      </p>
      <ul>
        <li>
          <strong>Access and take your data:</strong> Settings &gt; Download my data gives you everything we hold in one file.
        </li>
        <li>
          <strong>Correct it:</strong> change your follows and settings yourself, or email us to correct your name or email.
        </li>
        <li>
          <strong>Erase it:</strong> Settings &gt; Delete account removes your account and everything linked to it immediately.
          Settings &gt; Clear history removes reading events and Ask history.
        </li>
        <li>
          <strong>Withdraw consent:</strong> turn off the daily brief from any brief email or in Settings, or delete your account.
        </li>
        <li>
          <strong>Complain:</strong> contact us first (below). In India you may also approach the Data Protection Board of India; in
          the EU, your local data protection authority.
        </li>
      </ul>

      <h2 id="children">Age</h2>
      <p>
        Lede is not directed at children. Accounts are for people aged 18 or over, because Indian law requires verifiable parental
        consent to process the data of anyone younger. Anyone can read the site without an account.
      </p>

      <h2 id="changes">Changes</h2>
      <p>
        If we change this policy we update the date at the top. If a change affects how we use data you have already given us, we
        will tell account holders by email before it takes effect.
      </p>

      <h2 id="contact">Contact and grievances</h2>
      <p>
        Questions, requests and grievances about your data: <a href={`mailto:${email}`}>{email}</a>. We aim to reply within a few
        days and to resolve requests within 30 days. See also the <Link href="/terms">terms and conditions</Link>.
      </p>
    </LegalPage>
  );
}
