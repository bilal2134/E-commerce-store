import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyDsqlMigrations, splitStatements } from "../../scripts/lib/dsql-migrate";
import { TEST_DATABASE_URL } from "@tests/helpers/test-db-url";

/**
 * The Aurora DSQL schema (drizzle/dsql) must describe exactly the same database
 * as the Drizzle migrations (drizzle/0000..). Both are applied to PostgreSQL and
 * compared through the catalog. Only index sort direction may differ: DSQL
 * indexes have no DESC, and PostgreSQL scans them backwards instead.
 */
const DSQL_DB = `${new URL(TEST_DATABASE_URL).pathname.slice(1)}_dsql`;
const dsqlUrl = (() => {
  const u = new URL(TEST_DATABASE_URL);
  u.pathname = `/${DSQL_DB}`;
  return u.toString();
})();

let admin: postgres.Sql;
let drizzleDb: postgres.Sql;
let dsqlDb: postgres.Sql;

async function describeSchema(sql: postgres.Sql) {
  const columns = await sql<{ v: string }[]>`
    select c.table_name || '.' || c.column_name || ' ' || c.data_type || ' ' || c.is_nullable
      || ' default=' || coalesce(c.column_default, '') || ' identity=' || c.is_identity as v
    from information_schema.columns c
    where c.table_schema = 'public' and c.table_name <> 'dsql_migrations'
    order by 1`;
  const constraints = await sql<{ v: string }[]>`
    select rel.relname || '.' || con.conname || ' ' || pg_get_constraintdef(con.oid) as v
    from pg_constraint con join pg_class rel on rel.oid = con.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname <> 'dsql_migrations'
    order by 1`;
  const indexes = await sql<{ v: string }[]>`
    select indexname || ' ' || replace(replace(replace(indexdef, ' DESC NULLS LAST', ''), ' DESC', ''), 'public.', '') as v
    from pg_indexes where schemaname = 'public' and tablename <> 'dsql_migrations'
    order by 1`;
  const sequences = await sql<{ v: string }[]>`
    select sequencename as v from pg_sequences
    where schemaname = 'public' and sequencename not like '%_id_seq'
    order by 1`;
  return {
    columns: columns.map((r) => r.v),
    constraints: constraints.map((r) => r.v),
    indexes: indexes.map((r) => r.v),
    sequences: sequences.map((r) => r.v),
  };
}

beforeAll(async () => {
  admin = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  await admin.unsafe(`drop database if exists "${DSQL_DB}" with (force)`);
  await admin.unsafe(`create database "${DSQL_DB}"`);
  drizzleDb = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  dsqlDb = postgres(dsqlUrl, { max: 1, onnotice: () => {} });
});

afterAll(async () => {
  await dsqlDb?.end();
  await drizzleDb?.end();
  await admin?.unsafe(`drop database if exists "${DSQL_DB}" with (force)`);
  await admin?.end();
});

describe("Aurora DSQL baseline (drizzle/dsql)", () => {
  it("splits statements and drops comment-only chunks", () => {
    expect(splitStatements("-- header\nSELECT 1;\n--> statement-breakpoint\n-- only a comment\n")).toEqual([
      "-- header\nSELECT 1;",
    ]);
  });

  it("matches the Drizzle-migrated schema exactly", async () => {
    expect(await applyDsqlMigrations(dsqlDb, { target: "postgres" })).toEqual(["0000_baseline.sql"]);
    const [fromDrizzle, fromDsql] = await Promise.all([describeSchema(drizzleDb), describeSchema(dsqlDb)]);
    expect(fromDsql.columns).toEqual(fromDrizzle.columns);
    expect(fromDsql.constraints).toEqual(fromDrizzle.constraints);
    expect(fromDsql.indexes).toEqual(fromDrizzle.indexes);
    expect(fromDsql.sequences).toEqual(fromDrizzle.sequences);
  });

  it("is idempotent and seeds the settings singleton", async () => {
    expect(await applyDsqlMigrations(dsqlDb, { target: "postgres" })).toEqual([]);
    const [row] = await dsqlDb`select count(*)::int as n from site_settings`;
    expect(row?.n).toBe(1);
  });
});
