/**
 * Standalone DB/storage access for CLI scripts (seed, admin creation).
 * Scripts run with `tsx --conditions react-server` so `server-only` imports
 * in shared modules resolve to no-ops.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../src/server/db/schema";
import { S3Storage } from "../../src/server/storage/s3";

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name} (see .env.example)`);
  return v;
}

export function connect() {
  const sql = postgres(requireEnv("DATABASE_URL"), {
    max: 2,
    prepare: process.env.DATABASE_PREPARE !== "false",
    ssl: sslMode(process.env.DATABASE_SSL),
    onnotice: () => {},
  });
  return { sql, db: drizzle(sql, { schema, casing: "snake_case" }) };
}

export function scriptStorage() {
  return new S3Storage({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "us-east-1",
    bucket: requireEnv("S3_BUCKET"),
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    publicBaseUrl: requireEnv("MEDIA_BASE_URL"),
  });
}

/** DATABASE_SSL: disable | require | verify-full (verify-full checks the server certificate). */
function sslMode(value: string | undefined): "verify-full" | "require" | false {
  if (value === "verify-full") return "verify-full";
  if (value === "require") return "require";
  return false;
}
