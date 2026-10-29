import { z } from "zod";
import { body, json, withUser } from "@/lib/http";
import { getSettings, updateSettings } from "@/lib/services/reader";

const schema = z.object({
  briefEnabled: z.boolean().optional(),
  briefHour: z.number().int().min(0).max(23).optional(),
  // The brief job runs every 15 minutes, so times are kept to quarter hours.
  briefMinute: z.union([z.literal(0), z.literal(15), z.literal(30), z.literal(45)]).optional(),
  timezone: z.string().min(1).max(64).optional(),
});

export const GET = withUser(async (_req, { user }) => json(await getSettings(user.id)));
export const PATCH = withUser(async (req, { user }) => {
  const patch = await body(req, schema);
  if (patch.timezone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: patch.timezone });
    } catch {
      return json({ error: "Unknown time zone." }, { status: 400 });
    }
  }
  await updateSettings(user.id, patch);
  return json(await getSettings(user.id));
});
