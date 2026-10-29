import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { body, json, withAdmin } from "@/lib/http";

export const PATCH = withAdmin<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const { active } = await body(req, z.object({ active: z.boolean() }));
  const db = await getDb();
  await db.update(sources).set({ active }).where(eq(sources.id, z.uuid().parse(id)));
  return json({ ok: true });
});
