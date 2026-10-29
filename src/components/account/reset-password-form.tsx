"use client";

import { useId, useState } from "react";
import { authClient } from "@/lib/client/auth-client";

const MIN_PASSWORD = 8;

/** Step 1 (no token): email a reset link. Step 2 (token from the emailed link): choose a new password. */
export function ResetPasswordForm({ token }: { token: string | null }) {
  const ids = useId();
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = token
      ? await authClient.resetPassword({ newPassword: value, token })
      : await authClient.requestPasswordReset({ email: value.trim(), redirectTo: "/reset-password" });
    setBusy(false);
    if (!error) return setDone(true);
    if (error.status === 429) setError("Too many attempts. Wait a minute, then try again.");
    else if (error.code === "INVALID_TOKEN") setError("This link has expired or was already used. Ask for a new one.");
    else if (error.code === "PASSWORD_TOO_SHORT") setError(`Use at least ${MIN_PASSWORD} characters.`);
    else setError("Something went wrong on our side. Try again in a moment.");
  }

  if (done) {
    return token ? (
      <div>
        <p className="hed hed-sm">Password changed</p>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">You’ve been signed out everywhere else. Sign in with your new password.</p>
        <a href="/sign-in" className="btn btn-primary mt-6 h-11 w-full">
          Sign in
        </a>
      </div>
    ) : (
      <div>
        <p className="hed hed-sm">Check your inbox</p>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">
          If an account exists for <span className="font-medium text-ink">{value.trim()}</span>, we’ve sent a link to choose a new password. It
          expires in 30 minutes.
        </p>
        <a href="/sign-in" className="mt-5 inline-block text-[0.9375rem] text-pencil underline underline-offset-4">
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor={`${ids}-field`} className="block text-[0.875rem] font-medium">
        {token ? "New password" : "Email"}
      </label>
      <div className="relative mt-1.5">
        <input
          id={`${ids}-field`}
          type={token ? (show ? "text" : "password") : "email"}
          required
          minLength={token ? MIN_PASSWORD : undefined}
          autoComplete={token ? "new-password" : "email"}
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`field ${token ? "pr-16" : ""}`}
        />
        {token && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            aria-controls={`${ids}-field`}
            className="absolute inset-y-0 right-0 px-3.5 text-[0.8125rem] font-medium text-ink-muted hover:text-ink"
          >
            {show ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {token && <p className="meta mt-2">At least {MIN_PASSWORD} characters.</p>}
      {error && (
        <p role="alert" className="mt-4 text-[0.875rem] text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn btn-primary mt-6 h-11 w-full">
        {token ? (busy ? "Saving…" : "Set new password") : busy ? "Sending link…" : "Email me a reset link"}
      </button>
    </form>
  );
}
