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

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ brief?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/settings");
  const { brief } = await searchParams;
  const res = await load(async () => ({ settings: await getSettings(user.id), state: await getReaderState(user.id) }));
  if (!res.ok) return <ErrorNotice what="your settings" />;
  return (
    <div className="shell pt-10 md:pt-14">
      <h1 className="hed hed-xl">Settings</h1>
      <p className="meta mt-3">Signed in as {user.email}</p>
      {brief === "off" && <p className="mt-6 rounded-lg bg-pencil-soft px-4 py-3 text-[0.9375rem]">The daily brief is off. You won’t get any more brief emails.</p>}
      <SettingsPanel
        settings={{ briefEnabled: res.data.settings.briefEnabled, briefHour: res.data.settings.briefHour, timezone: res.data.settings.timezone }}
        follows={res.data.state.follows}
        emailAvailable={hasEmail()}
        isAdmin={user.isAdmin}
      />
    </div>
  );
}
