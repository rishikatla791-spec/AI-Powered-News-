import { z } from "zod";
import { body, json, withUser } from "@/lib/http";
import { setFollow } from "@/lib/services/reader";

const schema = z.object({
  targetType: z.enum(["topic", "entity", "source"]),
  targetSlug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  muted: z.boolean().optional(),
});

export const POST = withUser(async (req, { user }) => {
  const b = await body(req, schema);
  await setFollow(user.id, b.targetType, b.targetSlug, true, b.muted ?? false);
  return json({ ok: true });
});
export const DELETE = withUser(async (req, { user }) => {
  const b = await body(req, schema);
  await setFollow(user.id, b.targetType, b.targetSlug, false);
  return json({ ok: true });
});
