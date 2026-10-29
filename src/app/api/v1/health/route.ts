import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { hasDatabase, hasEmbeddings, hasLLM } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  let database = "not configured";
  if (hasDatabase()) {
    try {
      const db = await getDb();
      await db.execute(sql`select 1`);
      database = "ok";
    } catch {
      database = "unreachable";
    }
  }
  return Response.json({ status: database === "ok" ? "ok" : "degraded", database, llm: hasLLM(), embeddings: hasEmbeddings() });
}
