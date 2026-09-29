import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { TEST_DATABASE_URL } from "./test-db-url";

/** Drops and recreates the test database schema, then applies ./drizzle migrations. */
export default async function setup() {
  const sql = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await sql.unsafe("drop schema if exists drizzle cascade");
    await sql.unsafe("drop schema if exists public cascade");
    await sql.unsafe("create schema public");
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  } finally {
    await sql.end();
  }
}
