import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

/**
 * One pooled connection per server instance. Cached on globalThis so dev
 * hot-reloads don't leak connections.
 */
const globalForDb = globalThis as unknown as { __usbaSql?: postgres.Sql; __usbaDb?: Database };

function create(): { sql: postgres.Sql; db: Database } {
  const e = env();
  const sql = postgres(e.DATABASE_URL, {
    max: e.DATABASE_POOL_MAX,
    prepare: e.DATABASE_PREPARE,
    ssl: e.DATABASE_SSL === "disable" ? false : e.DATABASE_SSL === "require" ? "require" : "verify-full",
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });
  return { sql, db: drizzle(sql, { schema, casing: "snake_case" }) };
}

export function db(): Database {
  if (!globalForDb.__usbaDb) {
    const created = create();
    globalForDb.__usbaSql = created.sql;
    globalForDb.__usbaDb = created.db;
  }
  return globalForDb.__usbaDb;
}

export { schema };
