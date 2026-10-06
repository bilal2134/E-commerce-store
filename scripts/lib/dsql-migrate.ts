/**
 * Applies drizzle/dsql/*.sql (ADR 0014). Aurora DSQL allows one DDL statement
 * per transaction and builds indexes and validates constraints asynchronously,
 * so every statement runs on its own (autocommit) and each ASYNC job is
 * awaited with sys.wait_for_job before continuing. Statements use IF NOT
 * EXISTS (or tolerate an existing constraint), so a run that stopped halfway
 * can simply be repeated.
 *
 * `target: "postgres"` applies the same files to plain PostgreSQL (ASYNC
 * removed); tests use it to prove the DSQL schema matches the Drizzle one.
 */
import fs from "node:fs";
import path from "node:path";
import type postgres from "postgres";

export const DSQL_MIGRATIONS_DIR = path.join(process.cwd(), "drizzle", "dsql");

export interface ApplyOptions {
  target: "dsql" | "postgres";
  dir?: string;
  log?: (msg: string) => void;
}

export function splitStatements(fileSql: string): string[] {
  return fileSql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.split("\n").some((line) => line.trim() !== "" && !line.trim().startsWith("--")));
}

export async function applyDsqlMigrations(sql: postgres.Sql, opts: ApplyOptions): Promise<string[]> {
  const dir = opts.dir ?? DSQL_MIGRATIONS_DIR;
  const log = opts.log ?? (() => {});
  await sql.unsafe(
    "CREATE TABLE IF NOT EXISTS dsql_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const done = new Set((await sql<{ name: string }[]>`select name from dsql_migrations`).map((r) => r.name));
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    log(`applying ${file}`);
    for (const statement of splitStatements(fs.readFileSync(path.join(dir, file), "utf8"))) {
      // CREATE INDEX ASYNC and ALTER TABLE ASYNC … VALIDATE CONSTRAINT run as DSQL jobs.
      const isAsync = /\b(INDEX|TABLE)\s+ASYNC\b/i.test(statement);
      const text =
        opts.target === "postgres" ? statement.replace(/\b(INDEX|TABLE)\s+ASYNC\b/i, "$1") : statement;
      let rows: { job_id?: string }[];
      try {
        rows = await sql.unsafe<{ job_id?: string }[]>(text);
      } catch (err) {
        // ADD CONSTRAINT has no IF NOT EXISTS: on a re-run after a partial
        // failure, an existing constraint (42710) means the step already ran.
        if (/\bADD\s+CONSTRAINT\b/i.test(statement) && (err as { code?: string }).code === "42710") continue;
        throw err;
      }
      const jobId = rows[0]?.job_id;
      if (opts.target === "dsql" && isAsync && jobId) {
        // A procedure in DSQL: blocks until the index build finishes or fails.
        await sql.unsafe(`CALL sys.wait_for_job('${jobId.replace(/[^a-z0-9]/gi, "")}')`);
        const [job] = await sql<{ status: string; details: string | null }[]>`
          select status, details from sys.jobs where job_id = ${jobId}`;
        if (job && job.status !== "completed") {
          throw new Error(
            `DDL job ${jobId} ${job.status}: ${job.details ?? ""} (${statement.split("\n")[0]})`,
          );
        }
      }
    }
    await sql`insert into dsql_migrations (name) values (${file})`;
    applied.push(file);
  }
  return applied;
}

/**
 * Creates the application's database role and maps it to the Lambda's IAM
 * role (DSQL `AWS IAM GRANT`). The app only gets data access: no DDL.
 */
export async function grantAppRole(sql: postgres.Sql, appUser: string, iamRoleArn: string): Promise<void> {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(appUser)) throw new Error(`Invalid role name: ${appUser}`);
  if (!/^arn:aws:iam::\d{12}:role\/[\w+=,.@/-]+$/.test(iamRoleArn))
    throw new Error(`Invalid IAM role ARN: ${iamRoleArn}`);
  const [exists] = await sql`select 1 from pg_roles where rolname = ${appUser}`;
  if (!exists) await sql.unsafe(`CREATE ROLE ${appUser} WITH LOGIN`);
  await sql.unsafe(`AWS IAM GRANT ${appUser} TO '${iamRoleArn}'`);
  // DSQL treats `public` as a system schema (usable by every role, like
  // PostgreSQL 15+) and rejects grants on it with 0A000; elsewhere it's needed.
  await sql.unsafe(`GRANT USAGE ON SCHEMA public TO ${appUser}`).catch((err: { code?: string }) => {
    if (err.code !== "0A000") throw err;
  });
  const tables = await sql<{ name: string }[]>`
    select tablename as name from pg_tables where schemaname = 'public' and tablename <> 'dsql_migrations'`;
  for (const { name } of tables) {
    await sql.unsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON public.${quoteIdent(name)} TO ${appUser}`);
  }
  const sequences = await sql<{ name: string }[]>`
    select sequencename as name from pg_sequences where schemaname = 'public'`;
  for (const { name } of sequences) {
    await sql.unsafe(`GRANT USAGE, SELECT ON SEQUENCE public.${quoteIdent(name)} TO ${appUser}`);
  }
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
