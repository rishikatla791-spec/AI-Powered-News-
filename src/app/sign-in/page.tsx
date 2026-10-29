import type { Metadata } from "next";
import { SignInForm } from "@/components/account/sign-in-form";
import { hasAuth, hasGoogleAuth } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <div className="shell grid min-h-[70vh] place-items-center py-16">
      <div className="w-full max-w-[420px]">
        <h1 className="hed hed-lg">Sign in to Lede</h1>
        <p className="dek mt-3 text-[1.0625rem]">
          Reading never needs an account. Sign in to save stories, follow sections and people, and get a daily brief.
        </p>
        {hasAuth() ? (
          <SignInForm next={safeNext} google={hasGoogleAuth()} />
        ) : (
          <p className="mt-8 rounded-lg border border-dashed border-rule-strong p-5 text-[0.9375rem] text-ink-2">
            Sign-in isn’t switched on for this deployment yet. It needs a database and an auth secret; the README explains how.
          </p>
        )}
        <p className="meta mt-8">
          By signing in you agree to the <a href="/terms" className="underline underline-offset-4">terms</a> and{" "}
          <a href="/privacy" className="underline underline-offset-4">privacy policy</a>. We store your email address and what you choose to
          save or follow, nothing else.
        </p>
      </div>
    </div>
  );
}
