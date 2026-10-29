import type { Metadata } from "next";
import { SignInForm } from "@/components/account/sign-in-form";
import { hasAuth, hasEmail, hasGoogleAuth } from "@/lib/env";
import { getLiveStats } from "@/lib/services/stories";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const PERKS = [
  { title: "Saved stories", body: "Keep a story and come back when it has moved on. Saved stories are never deleted by cleanup." },
  { title: "Following", body: "Follow sections, people and places. Their latest stories open your front page, under From what you follow." },
  { title: "Daily brief", body: "One email at the hour you choose, with the stories most outlets covered. Unsubscribe in one click." },
];

async function liveStats() {
  try {
    return await getLiveStats();
  } catch {
    return null;
  }
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const stats = hasAuth() ? await liveStats() : null;
  // Only promise what this deployment can do: the brief needs an email provider.
  const perks = hasEmail() ? PERKS : PERKS.filter((p) => p.title !== "Daily brief");

  return (
    <div className="shell py-10 md:py-16 lg:py-24">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <section className="order-2 lg:order-1 lg:col-span-6 lg:pt-2 xl:col-span-7">
          <h1 className="hed hed-lg max-w-[16ch]">Your desk, kept between visits.</h1>
          <p className="dek mt-4 max-w-[46ch]">Reading never needs an account. An account remembers what you care about.</p>

          <ul className="mt-10 max-w-[52ch] border-t border-rule">
            {perks.map((p) => (
              <li key={p.title} className="grid gap-1 border-b border-rule py-5 sm:grid-cols-[10rem_1fr] sm:gap-6">
                <span className="hed hed-sm">{p.title}</span>
                <span className="text-[0.9375rem] leading-relaxed text-ink-2">{p.body}</span>
              </li>
            ))}
          </ul>

          {stats && stats.articles24h > 0 && (
            <p className="meta mt-6 max-w-[52ch]">
              In the last 24 hours Lede read <span className="num text-ink-2">{stats.articles24h.toLocaleString("en-IN")}</span> reports from{" "}
              <span className="num text-ink-2">{stats.outlets24h}</span> outlets.
            </p>
          )}
        </section>

        <section aria-label="Sign in or create an account" className="order-1 lg:order-2 lg:col-span-6 xl:col-span-5">
          <div className="rounded-xl border border-rule bg-paper-raised p-6 sm:p-8 lg:ml-auto lg:max-w-[440px]">
            {hasAuth() ? (
              <SignInForm next={safeNext} google={hasGoogleAuth()} email={hasEmail()} />
            ) : (
              <p className="text-[0.9375rem] leading-relaxed text-ink-2">
                Sign-in isn’t switched on for this deployment yet. It needs a database and an auth secret; the README explains how.
              </p>
            )}
            <p className="meta mt-6 border-t border-rule pt-5">
              By continuing you agree to the{" "}
              <a href="/terms" className="underline underline-offset-4 hover:text-ink">
                terms
              </a>{" "}
              and{" "}
              <a href="/privacy" className="underline underline-offset-4 hover:text-ink">
                privacy policy
              </a>
              . We store your email address and what you choose to save or follow.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
