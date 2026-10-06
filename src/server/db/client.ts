import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env";
import { dsqlPassword, withConflictRetry } from "./dsql";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

/**
 * One pooled connection per server instance. Cached on globalThis so dev
 * hot-reloads don't leak connections.
 */
const globalForDb = globalThis as unknown as { __usbaSql?: postgres.Sql; __usbaDb?: Database };

function create(): { sql: postgres.Sql; db: Database } {
  const e = env();
  const dsql = e.DATABASE_AUTH === "dsql-iam";
  const sql = postgres(e.DATABASE_URL, {
    max: e.DATABASE_POOL_MAX,
    prepare: e.DATABASE_PREPARE,
    ssl: e.DATABASE_SSL === "disable" ? false : e.DATABASE_SSL === "require" ? "require" : "verify-full",
    idle_timeout: 20,
    connect_timeout: 10,
    // Aurora DSQL closes connections after 1 hour; recycle them before that.
    max_lifetime: dsql ? 50 * 60 : null,
    ...(dsql ? { password: dsqlPassword(e.DATABASE_URL) } : {}),
    onnotice: () => {},
  });
  const database = drizzle(sql, { schema, casing: "snake_case" });
  // Every transaction callback in this app is safe to re-run, so concurrency
  // conflicts (DSQL optimistic concurrency, SQLSTATE 40001) are retried here.
  const transaction = database.transaction.bind(database);
  database.transaction = ((fn, config) =>
    withConflictRetry(() => transaction(fn, config))) as typeof transaction;
  return { sql, db: database };
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
