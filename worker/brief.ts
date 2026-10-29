import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobRuns, user, userSettings } from "@/lib/db/schema";
import { hasEmail } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { briefEmail } from "@/lib/email-templates";
import { unsubscribeUrl } from "@/lib/brief-token";
import { getFrontPage } from "@/lib/services/stories";
import { getPersonalFeed } from "@/lib/services/reader";
import { formatDate } from "@/lib/format";

/**
 * Sends the daily brief to readers whose chosen hour (in their own time zone)
 * is the current hour. Runs hourly from GitHub Actions; never sends twice in 20 hours.
 */
if (!hasEmail()) {
  console.log("RESEND_API_KEY not set; skipping briefs.");
  process.exit(0);
}
const db = await getDb();
const [run] = await db.insert(jobRuns).values({ kind: "brief" }).returning();
const recipients = await db
  .select({ id: user.id, email: user.email, hour: userSettings.briefHour, tz: userSettings.timezone, last: userSettings.lastBriefSentAt })
  .from(userSettings)
  .innerJoin(user, eq(user.id, userSettings.userId))
  .where(and(eq(userSettings.briefEnabled, true), eq(user.emailVerified, true)));

const now = new Date();
const top = (await getFrontPage({ limit: 20 })).stories.filter((s) => s.outletCount > 1);
let sent = 0;
let failed = 0;
for (const r of recipients) {
  const localHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: r.tz, hour: "numeric", hourCycle: "h23" }).format(now));
  if (localHour !== r.hour) continue;
  if (r.last && now.getTime() - r.last.getTime() < 20 * 3600_000) continue;
  try {
    const personal = await getPersonalFeed(r.id);
    const seen = new Set<string>();
    const items = [...personal.slice(0, 3), ...top]
      .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
      .slice(0, 8)
      .map((s) => ({ headline: s.headline, slug: s.slug, keyPoint: s.keyPoint, outletCount: s.outletCount }));
    if (items.length === 0) continue;
    const unsub = unsubscribeUrl(r.id);
    const { subject, html, text } = briefEmail(items, formatDate(now, { weekday: "long", day: "numeric", month: "long" }), unsub);
    await sendEmail({ to: r.email, subject, html, text, headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } });
    await db.update(userSettings).set({ lastBriefSentAt: now }).where(eq(userSettings.userId, r.id));
    sent++;
  } catch (err) {
    failed++;
    console.error("[brief]", r.id, (err as Error).message);
  }
}
if (run) {
  await db
    .update(jobRuns)
    .set({ finishedAt: new Date(), status: failed ? "partial" : "ok", steps: [{ name: "brief", processed: sent, failed, ms: Date.now() - now.getTime() }] })
    .where(eq(jobRuns.id, run.id));
}
console.log(`Briefs sent: ${sent}, failed: ${failed}`);
process.exit(0);
