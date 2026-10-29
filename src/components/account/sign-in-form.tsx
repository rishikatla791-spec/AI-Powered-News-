"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { authClient } from "@/lib/client/auth-client";

export function SignInForm({ next, google }: { next: string; google: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await authClient.signIn.magicLink({ email: email.trim(), callbackURL: next });
    if (error) {
      setError(error.status === 429 ? "Too many attempts. Wait a minute, then try again." : "The link couldn’t be sent. Check the address and try again.");
      setState("error");
    } else setState("sent");
  }

  return (
    <div className="mt-8">
      <AnimatePresence mode="wait" initial={false}>
        {state === "sent" ? (
          <motion.div key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-lg border border-rule bg-paper-raised p-6">
            <p className="font-semibold">Check your inbox</p>
            <p className="mt-2 text-[0.9375rem] text-ink-2">
              We sent a sign-in link to <span className="font-medium text-ink">{email}</span>. It works once and expires in 15 minutes.
            </p>
            <button type="button" onClick={() => setState("idle")} className="mt-4 text-[0.9375rem] text-pencil underline underline-offset-4">
              Use a different email
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={sendLink} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <label htmlFor="email" className="text-[0.875rem] font-medium">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field mt-1.5"
              aria-describedby={state === "error" ? "email-error" : undefined}
            />
            {state === "error" && (
              <p id="email-error" className="mt-2 text-[0.875rem] text-danger">
                {error}
              </p>
            )}
            <button type="submit" disabled={state === "sending"} className="btn btn-primary mt-4 h-11 w-full">
              {state === "sending" ? "Sending link…" : "Email me a sign-in link"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {google && state !== "sent" && (
        <>
          <div className="my-6 flex items-center gap-3 text-[0.8125rem] text-ink-muted">
            <span className="h-px flex-1 bg-rule" /> or <span className="h-px flex-1 bg-rule" />
          </div>
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
        </>
      )}
    </div>
  );
}
