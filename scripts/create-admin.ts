/**
 * Create or reset the admin account:
 *   ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='long passphrase' pnpm admin:create
 */
import { connect } from "./lib/script-db";
import { ensureAdmin } from "./lib/admin";

async function main() {
  const { sql, db } = connect();
  await ensureAdmin(db);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
