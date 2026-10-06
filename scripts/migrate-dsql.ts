/**
 * Applies the Aurora DSQL schema (drizzle/dsql/*.sql) and optionally maps the
 * app's database role to the Lambda IAM role (ADR 0014).
 *
 *   DATABASE_URL=postgres://admin@<cluster>.dsql.<region>.on.aws:5432/postgres \
 *     pnpm db:migrate:dsql [--grant-app-role <lambda-role-arn>] [--app-user usba_app]
 *
 * Connects as `admin` with an IAM token signed from the current AWS
 * credentials (needs dsql:DbConnectAdmin). `--postgres` applies the same files
 * to plain PostgreSQL instead (password auth, ASYNC removed) for local checks.
 */
import postgres from "postgres";
import { dsqlPassword } from "../src/server/db/dsql";
import { applyDsqlMigrations, grantAppRole } from "./lib/dsql-migrate";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const toPostgres = args.includes("--postgres");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

async function main(databaseUrl: string) {
  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: toPostgres ? false : "verify-full",
    ...(toPostgres ? {} : { password: dsqlPassword(databaseUrl) }),
    onnotice: () => {},
  });

  try {
    const applied = await applyDsqlMigrations(sql, {
      target: toPostgres ? "postgres" : "dsql",
      log: (m) => console.log(m),
    });
    console.log(applied.length ? `Applied ${applied.join(", ")}.` : "Schema already up to date.");
    const roleArn = flag("--grant-app-role");
    if (roleArn) {
      const appUser = flag("--app-user") ?? "usba_app";
      await grantAppRole(sql, appUser, roleArn);
      console.log(`Role ${appUser} can now connect as ${roleArn}.`);
    }
  } finally {
    await sql.end();
  }
}

main(url).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
