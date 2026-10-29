import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { flags } from "@/lib/db/schema";
import { body, json, withAdmin } from "@/lib/http";

export const PATCH = withAdmin<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const { status } = await body(req, z.object({ status: z.enum(["open", "resolved", "dismissed"]) }));
  const db = await getDb();
  await db.update(flags).set({ status }).where(eq(flags.id, z.uuid().parse(id)));
  return json({ ok: true });
});
