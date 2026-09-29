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
    ssl: sslMode(process.env.DATABASE_SSL),
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

/** DATABASE_SSL: disable | require | verify-full (verify-full checks the server certificate). */
function sslMode(value: string | undefined): "verify-full" | "require" | false {
  if (value === "verify-full") return "verify-full";
  if (value === "require") return "require";
  return false;
}
