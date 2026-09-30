/**
 * Prepares the E2E database: migrates and seeds it. Refuses to run unless
 * DATABASE_URL points at a database whose name ends in "_test", because
 * seeding truncates the catalogue tables.
 */
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";
const dbName = url.split("/").pop()?.split("?")[0] ?? "";
if (!dbName.endsWith("_test")) {
  console.error(`e2e:prepare refuses to run against "${dbName}". Use a database whose name ends in _test.`);
  process.exit(1);
}

for (const script of ["db:migrate", "db:seed"]) {
  // E2E asserts on a minimal, deterministic seed (no banner, payment FAQ or extra placeholders).
  const env = { ...process.env, SEED_PLACEHOLDERS: "0" };
  const result = spawnSync("pnpm", [script], { stdio: "inherit", shell: true, env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
