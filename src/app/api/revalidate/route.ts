import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import { problem } from "@/lib/http";

/** Called by the ingestion worker after each run so cached pages refresh immediately. */
export async function POST(req: Request) {
  const secret = env().REVALIDATE_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return problem(401, "Not allowed.");
  revalidatePath("/", "layout");
  return Response.json({ revalidated: true, at: new Date().toISOString() });
}
