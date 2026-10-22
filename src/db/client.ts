/**
 * Database connection.
 * - DATABASE_URL set → PostgreSQL (node-postgres)
 * - otherwise        → embedded PGlite stored in PGLITE_DIR (default ./.data/pglite)
 * Migrations in ./drizzle run once on first use.
 */
import path from "node:path";
import { mkdirSync } from "node:fs";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

/** Both drivers expose the same query API; this type is used everywhere. */
export type Db = PgliteDatabase<typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const db = drizzle(new Pool({ connectionString: url }), { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS });
    return db as unknown as Db;
  }
  return createPgliteDb(process.env.PGLITE_DIR || "./.data/pglite");
}

/** PGlite database; pass "memory://" for an in-memory database (tests). */
export async function createPgliteDb(dir: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (!dir.startsWith("memory://")) mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db;
}

const globalForDb = globalThis as unknown as { __dbPromise?: Promise<Db> };

/** Shared connection, kept on globalThis so dev hot reloads reuse it. */
export function getDb(): Promise<Db> {
  if (!globalForDb.__dbPromise) {
    globalForDb.__dbPromise = connect().catch((err) => {
      globalForDb.__dbPromise = undefined;
      throw err;
    });
  }
  return globalForDb.__dbPromise;
}
