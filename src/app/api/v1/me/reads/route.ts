import { z } from "zod";
import { body, json, rateLimit, withUser } from "@/lib/http";
import { recordRead } from "@/lib/services/reader";

export const POST = withUser(async (req, { user }) => {
  const { storyId } = await body(req, z.object({ storyId: z.uuid() }));
  if ((await rateLimit(`reads:${user.id}`, 120, 3600)).ok) await recordRead(user.id, storyId);
  return json({ ok: true });
});
