/**
 * Applies SQL migrations from ./drizzle (checked into git). Safe to run on
 * every deploy; already-applied migrations are skipped.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const sql = postgres(url, {
    max: 1,
    ssl: process.env.DATABASE_SSL && process.env.DATABASE_SSL !== "disable" ? "require" : false,
    onnotice: () => {},
  });
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  await sql.end();
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
