import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

let instance: Promise<Db> | null = null;

/**
 * Returns the database. Production uses Neon over HTTP (stateless, ideal for
 * serverless). `pglite://path` runs an embedded Postgres (with pgvector) for
 * local development and tests, and migrates itself on first use.
 */
export function getDb(): Promise<Db> {
  if (!instance) instance = connect();
  return instance;
}

async function connect(): Promise<Db> {
  const url = env().DATABASE_URL;
  if (!url) throw new DatabaseNotConfiguredError();
  if (url.startsWith("pglite://")) {
    const { createPglite } = await import("./pglite");
    return (await createPglite(url.slice("pglite://".length))) as unknown as Db;
  }
  return drizzleNeon(neon(url), { schema });
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set");
    this.name = "DatabaseNotConfiguredError";
  }
}

export { schema };
