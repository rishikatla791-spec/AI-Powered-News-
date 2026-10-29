import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

/** Embedded Postgres for local dev and tests. `dir` of ":memory:" keeps it in memory. */
export async function createPglite(dir: string) {
  const extensions = { vector, pg_trgm };
  if (dir !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(dir)), { recursive: true });
  const client =
    dir === ":memory:" ? new PGlite({ extensions }) : new PGlite({ dataDir: path.resolve(dir), extensions });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  return db;
}
