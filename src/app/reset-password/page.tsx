import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/account/reset-password-form";
import { hasAuth, hasEmail } from "@/lib/env";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  const expired = error === "INVALID_TOKEN";

  return (
    <div className="shell grid min-h-[70vh] place-items-center py-16">
      <div className="w-full max-w-[440px] rounded-xl border border-rule bg-paper-raised p-6 sm:p-8">
        <h1 className="hed hed-md">{token ? "Choose a new password" : "Reset your password"}</h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">
          {token
            ? "Pick something you don’t use on other sites."
            : expired
              ? "That reset link has expired or was already used. Ask for a new one below."
              : "Enter the email you signed up with and we’ll send you a link."}
        </p>
        <div className="mt-7">
          {!hasAuth() ? (
            <p className="text-[0.9375rem] text-ink-2">Accounts aren’t switched on for this deployment yet.</p>
          ) : !token && !hasEmail() ? (
            <p className="text-[0.9375rem] leading-relaxed text-ink-2">
              Password reset emails aren’t switched on for this deployment yet. Contact us from the{" "}
              <a href="/contact" className="text-pencil underline underline-offset-4">
                contact page
              </a>{" "}
              and we’ll help.
            </p>
          ) : (
            <ResetPasswordForm token={token ?? null} />
          )}
        </div>
      </div>
    </div>
  );
}
