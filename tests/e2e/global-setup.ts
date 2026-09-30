import postgres from "postgres";

/** Login attempts are rate limited per account; clear counters so repeated runs stay green. */
export default async function globalSetup() {
  const url =
    process.env.E2E_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgres://usba:usba_dev_password@localhost:54329/usba_test";
  if (!new URL(url).pathname.endsWith("_test")) return;
  const sql = postgres(url, { max: 1 });
  await sql`delete from rate_limits`;
  await sql.end();
}
