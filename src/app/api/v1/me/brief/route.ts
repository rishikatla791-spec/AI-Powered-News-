import { getSessionUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { hasEmail } from "@/lib/env";
import { json, problem, rateLimit, withUser } from "@/lib/http";
import { briefTopStories, composeBrief } from "@/lib/services/brief";

export const dynamic = "force-dynamic";

/** Sends the reader their brief now, so they can see what it looks like before the scheduled one. */
export const POST = withUser(async (_req, { user }) => {
  if (!hasEmail()) return problem(503, "Email isn’t configured on this deployment.");
  // The cached session can predate a confirmation made on another device.
  if (!(await getSessionUser({ fresh: true }))?.emailVerified) return problem(403, "Confirm your email address first.");
  const limit = await rateLimit(`brief-test:${user.id}`, 3, 3600);
  if (!limit.ok) return problem(429, "You can send three test briefs an hour. Try again later.");
  const brief = await composeBrief(user.id, await briefTopStories());
  if (!brief) return problem(409, "There are no stories to put in a brief yet.");
  await sendEmail({ to: user.email, ...brief });
  return json({ sent: true, to: user.email });
});
