"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { authClient } from "@/lib/client/auth-client";

type Mode = "sign-in" | "sign-up" | "link";

const MIN_PASSWORD = 8;

/** Readable name from an email address until the reader sets one in Settings. */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const words = local.replace(/[._+-]+/g, " ").replace(/\d+/g, " ").trim();
  return words ? words.replace(/\b\w/g, (c) => c.toUpperCase()) : "Reader";
}

function messageFor(error: { status?: number; code?: string; message?: string }, mode: Mode): string {
  if (error.status === 429) return "Too many attempts. Wait a minute, then try again.";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don’t match.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with this email already exists.";
    case "PASSWORD_TOO_SHORT":
      return `Use at least ${MIN_PASSWORD} characters.`;
    case "PASSWORD_TOO_LONG":
      return "That password is too long.";
    case "INVALID_EMAIL":
      return "Check the email address.";
  }
  if (mode === "link") return "The link couldn’t be sent. Check the address and try again.";
  return "Something went wrong on our side. Try again in a moment.";
}

export function SignInForm({ next, google, email: emailEnabled }: { next: string; google: boolean; email: boolean }) {
  const router = useRouter();
  const ids = useId();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; code?: string } | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setLinkSent(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const address = email.trim();
    const result =
      mode === "sign-in"
        ? await authClient.signIn.email({ email: address, password })
        : mode === "sign-up"
          ? await authClient.signUp.email({ email: address, password, name: nameFromEmail(address) })
          : await authClient.signIn.magicLink({ email: address, callbackURL: next });
    if (result.error) {
      setError({ text: messageFor(result.error, mode), code: result.error.code });
      setBusy(false);
      return;
    }
    if (mode === "link") {
      setLinkSent(true);
      setBusy(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  const isPassword = mode !== "link";
  const submitLabel = {
    "sign-in": busy ? "Signing in…" : "Sign in",
    "sign-up": busy ? "Creating account…" : "Create account",
    link: busy ? "Sending link…" : "Email me a sign-in link",
  }[mode];

  return (
    <div>
      {mode !== "link" && (
        <div role="tablist" aria-label="Account" className="flex gap-6 border-b border-rule">
          {(
            [
              ["sign-in", "Sign in"],
              ["sign-up", "Create account"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`relative -mb-px pb-3 text-[0.9375rem] font-medium transition-colors ${mode === m ? "text-ink" : "text-ink-muted hover:text-ink-2"}`}
            >
              {label}
              {mode === m && (
                <motion.span
                  layoutId={`${ids}-tab`}
                  className="absolute inset-x-0 -bottom-px h-[2px] bg-ink"
                  transition={{ type: "spring", stiffness: 520, damping: 42 }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {linkSent ? (
          <motion.div key="sent" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-1">
            <p className="hed hed-sm">Check your inbox</p>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">
              We sent a sign-in link to <span className="font-medium text-ink">{email}</span>. It works once and expires in 15 minutes.
            </p>
            <button type="button" onClick={() => switchMode("sign-in")} className="mt-5 text-[0.9375rem] text-pencil underline underline-offset-4">
              Back to sign in
            </button>
          </motion.div>
        ) : (
          <motion.form
            key={mode === "link" ? "link" : "password"}
            onSubmit={submit}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={mode === "link" ? "" : "pt-7"}
          >
            {mode === "link" && (
              <p className="mb-6 text-[0.9375rem] leading-relaxed text-ink-2">We’ll email you a link that signs you in. No password needed.</p>
            )}

            <label htmlFor={`${ids}-email`} className="block text-[0.875rem] font-medium">
              Email
            </label>
            <input
              id={`${ids}-email`}
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field mt-1.5"
            />

            {isPassword && (
              <>
                <div className="mt-5 flex items-baseline justify-between">
                  <label htmlFor={`${ids}-password`} className="text-[0.875rem] font-medium">
                    Password
                  </label>
                  {mode === "sign-in" && emailEnabled && (
                    <a href="/reset-password" className="text-[0.8125rem] text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="relative mt-1.5">
                  <input
                    id={`${ids}-password`}
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={mode === "sign-up" ? MIN_PASSWORD : undefined}
                    autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field pr-16"
                    aria-describedby={mode === "sign-up" ? `${ids}-hint` : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-pressed={showPassword}
                    aria-controls={`${ids}-password`}
                    className="absolute inset-y-0 right-0 px-3.5 text-[0.8125rem] font-medium text-ink-muted hover:text-ink"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {mode === "sign-up" && (
                  <p id={`${ids}-hint`} className="meta mt-2">
                    At least {MIN_PASSWORD} characters.
                  </p>
                )}
              </>
            )}

            {error && (
              <p role="alert" className="mt-4 text-[0.875rem] text-danger">
                {error.text}{" "}
                {(error.code === "USER_ALREADY_EXISTS" || error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") && (
                  <button type="button" onClick={() => switchMode("sign-in")} className="font-medium text-ink underline underline-offset-4">
                    Sign in instead
                  </button>
                )}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn btn-primary mt-6 h-11 w-full">
              {submitLabel}
            </button>

            {mode === "link" && (
              <button type="button" onClick={() => switchMode("sign-in")} className="btn btn-quiet mt-2 h-11 w-full">
                Use a password instead
              </button>
            )}
          </motion.form>
        )}
      </AnimatePresence>

      {mode !== "link" && (emailEnabled || google) && (
        <>
          <div className="my-6 flex items-center gap-3 text-[0.8125rem] text-ink-muted">
            <span className="h-px flex-1 bg-rule" /> or <span className="h-px flex-1 bg-rule" />
          </div>
          <div className="grid gap-2.5">
            {emailEnabled && (
              <button type="button" onClick={() => switchMode("link")} className="btn btn-secondary h-11 w-full">
                Email me a sign-in link
              </button>
            )}
            {google && (
              <button
                type="button"
                onClick={() => authClient.signIn.social({ provider: "google", callbackURL: next })}
                className="btn btn-secondary h-11 w-full gap-3"
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                </svg>
                Continue with Google
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
