import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getReaderState, getSettings } from "@/lib/services/reader";
import { load } from "@/lib/services/safe";
import { SettingsPanel } from "@/components/account/settings-panel";
import { ErrorNotice } from "@/components/ui/notice";
import { hasEmail } from "@/lib/env";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Errors the email-confirmation link can come back with. */
const CONFIRM_ERRORS: Record<string, string> = {
  TOKEN_EXPIRED: "That confirmation link has expired. Send yourself a new one below.",
  INVALID_TOKEN: "That confirmation link didn’t work. Use the newest email, or send yourself a new one below.",
  USER_NOT_FOUND: "That confirmation link belongs to an account that no longer exists.",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ brief?: string; error?: string }> }) {
  const user = await getSessionUser({ fresh: true });
  if (!user) redirect("/sign-in?next=/settings");
  const { brief, error } = await searchParams;
  const confirmError = error ? (CONFIRM_ERRORS[error] ?? "That confirmation link didn’t work. Send yourself a new one below.") : null;
  const res = await load(async () => ({ settings: await getSettings(user.id), state: await getReaderState(user.id) }));
  if (!res.ok) return <ErrorNotice what="your settings" />;
  return (
    <div className="shell pt-10 md:pt-14">
      <h1 className="hed hed-xl">Settings</h1>
      <p className="meta mt-3">Signed in as {user.email}</p>
      {confirmError && !user.emailVerified && (
        <p role="alert" className="mt-6 rounded-lg border border-danger/40 px-4 py-3 text-[0.9375rem] text-danger">
          {confirmError}
        </p>
      )}
      {brief === "off" &&<p className="mt-6 rounded-lg bg-pencil-soft px-4 py-3 text-[0.9375rem]">The daily brief is off. You won’t get any more brief emails.</p>}
      <SettingsPanel
        settings={{
          briefEnabled: res.data.settings.briefEnabled,
          briefHour: res.data.settings.briefHour,
          briefMinute: res.data.settings.briefMinute,
          timezone: res.data.settings.timezone,
        }}
        follows={res.data.state.follows}
        emailAvailable={hasEmail()}
        email={user.email}
        emailVerified={user.emailVerified}
        isAdmin={user.isAdmin}
      />
    </div>
  );
}
