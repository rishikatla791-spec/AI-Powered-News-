import path from "node:path";
import { env } from "@/lib/env";

const url = env().DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const migrationsFolder = path.resolve(process.cwd(), "drizzle");

if (url.startsWith("pglite://")) {
  const { createPglite } = await import("@/lib/db/pglite");
  await createPglite(url.slice("pglite://".length));
} else {
  const { neon } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-http");
  const { migrate } = await import("drizzle-orm/neon-http/migrator");
  await migrate(drizzle(neon(url)), { migrationsFolder });
}
console.log("Migrations applied.");
