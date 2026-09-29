/**
 * Plain-JS twin of scripts/migrate.ts for the production image (no tsx).
 * Applies SQL migrations from ./drizzle; already-applied ones are skipped.
 * Usage: node scripts/migrate.mjs   (needs DATABASE_URL, optional DATABASE_SSL)
 */
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const sql = postgres(url, {
    max: 1,
    ssl: sslMode(process.env.DATABASE_SSL),
    onnotice: () => {},
  });
  await migrate(drizzle(sql), { migrationsFolder });
  await sql.end();
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/** DATABASE_SSL: disable | require | verify-full (verify-full checks the server certificate). */
function sslMode(value) {
  if (value === "verify-full") return "verify-full";
  if (value === "require") return "require";
  return false;
}
