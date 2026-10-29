import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobRuns, user, userSettings } from "@/lib/db/schema";
import { hasEmail } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { briefTopStories, composeBrief } from "@/lib/services/brief";

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
const top = await briefTopStories();
let sent = 0;
let failed = 0;
for (const r of recipients) {
  const localHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: r.tz, hour: "numeric", hourCycle: "h23" }).format(now));
  if (localHour !== r.hour) continue;
  if (r.last && now.getTime() - r.last.getTime() < 20 * 3600_000) continue;
  try {
    const brief = await composeBrief(r.id, top, now);
    if (!brief) continue;
    await sendEmail({ to: r.email, ...brief });
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
