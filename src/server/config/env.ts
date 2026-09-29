import "server-only";
import { z } from "zod";

/**
 * Typed, validated server configuration. All environment access goes through
 * here; nothing else in the app reads `process.env` directly (scripts and
 * config files excepted). Values are server-only: anything the browser needs
 * is passed down as props so a single build artifact can run in any
 * environment.
 */

const booleanish = z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** Public origin of the storefront, used for canonical URLs, sitemap, OG. */
  SITE_URL: z.url().transform((u) => u.replace(/\/+$/, "")),

  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  /** Set to false behind transaction-mode poolers (Supabase :6543, PgBouncer). */
  DATABASE_PREPARE: booleanish.default(true),
  DATABASE_SSL: z.enum(["disable", "require", "verify-full"]).default("disable"),

  /** Empty for AWS S3; set for Supabase Storage, R2, RustFS/MinIO etc. */
  S3_ENDPOINT: z
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_BUCKET: z.string().min(3),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleanish.default(false),
  /** Public base URL objects are served from (CDN / public bucket). No trailing slash. */
  MEDIA_BASE_URL: z.url().transform((u) => u.replace(/\/+$/, "")),

  /**
   * Header containing the real client IP, set by *your* edge/proxy only
   * (e.g. `cf-connecting-ip`, `x-real-ip`, `x-forwarded-for`). Used for rate
   * limiting. Leave empty to fall back to a single shared bucket.
   */
  CLIENT_IP_HEADER: z.string().default(""),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  /** Analytics provider seam: "none" (default) or "plausible". */
  ANALYTICS_PROVIDER: z.enum(["none", "plausible"]).default("none"),
  PLAUSIBLE_DOMAIN: z.string().default(""),
  PLAUSIBLE_SCRIPT_URL: z.url().default("https://plausible.io/js/script.js"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\nSee .env.example.`);
  }
  cached = parsed.data;
  return cached;
}

export function isProduction(): boolean {
  return env().NODE_ENV === "production";
}

/** True when the site is served over HTTPS (controls Secure cookies, HSTS). */
export function isHttpsSite(): boolean {
  return env().SITE_URL.startsWith("https://");
}
