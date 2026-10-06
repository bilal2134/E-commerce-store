import { z } from "zod";

/**
 * Environment schema, shared by src/server/config/env.ts (runtime accessor)
 * and src/instrumentation.ts (fail-fast validation at server start). Kept free
 * of `server-only` so instrumentation can import it.
 */

const booleanish = z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1");

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** Public origin of the storefront, used for canonical URLs, sitemap, OG. */
  SITE_URL: z.url().transform((u) => u.replace(/\/+$/, "")),

  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  /** Set to false behind transaction-mode poolers (Supabase :6543, PgBouncer). */
  DATABASE_PREPARE: booleanish.default(true),
  DATABASE_SSL: z.enum(["disable", "require", "verify-full"]).default("disable"),
  /**
   * "password" uses the password in DATABASE_URL. "dsql-iam" signs a short-lived
   * Aurora DSQL token for every new connection with the runtime's IAM role
   * (ADR 0014); the user in DATABASE_URL must be mapped to that role.
   */
  DATABASE_AUTH: z.enum(["password", "dsql-iam"]).default("password"),

  /** Empty for AWS S3; set for Supabase Storage, R2, RustFS/MinIO etc. */
  S3_ENDPOINT: z
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_BUCKET: z.string().min(3),
  /** Both empty = AWS default credential chain (e.g. ECS task role). */
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),
  S3_FORCE_PATH_STYLE: booleanish.default(false),
  /** Prefix for uploaded objects, e.g. "media/" (AWS). Must match MEDIA_BASE_URL's path. */
  S3_KEY_PREFIX: z
    .string()
    .regex(/^([a-z0-9-]+\/)*$/, "Use lowercase path segments ending in '/', e.g. media/")
    .default(""),
  /** Public base URL objects are served from (CDN / public bucket). No trailing slash. */
  MEDIA_BASE_URL: z.url().transform((u) => u.replace(/\/+$/, "")),
  /**
   * CloudFront distribution in front of the app (AWS deployment). When set,
   * admin saves also invalidate the CDN copy of storefront pages.
   */
  CDN_DISTRIBUTION_ID: z.string().default(""),
  /**
   * SSM parameter holding the distribution ID, for stacks where the function
   * is created before the distribution (infrastructure/aws/cdk). Read once.
   */
  CDN_DISTRIBUTION_ID_PARAMETER: z.string().default(""),
  /**
   * Shared secret CloudFront sends as `x-origin-verify` (AWS deployment). When
   * set, src/proxy.ts rejects requests without it. At least 32 characters.
   */
  ORIGIN_VERIFY_SECRET: z.union([z.literal(""), z.string().min(32)]).default(""),

  /**
   * Header containing the real client IP, set by *your* edge/proxy only
   * (e.g. `cf-connecting-ip`, `x-real-ip`, `x-forwarded-for`). Used for rate
   * limiting. Leave empty to fall back to a single shared bucket.
   */
  CLIENT_IP_HEADER: z.string().default(""),
  /**
   * Number of proxies in front of the app that append to X-Forwarded-For
   * (e.g. 1 behind a single load balancer). The client IP is read that many
   * entries from the right, so client-supplied prefixes are ignored.
   */
  CLIENT_IP_TRUSTED_HOPS: z.coerce.number().int().min(1).max(5).default(1),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  /** Analytics provider seam: "none" (default) or "plausible". */
  ANALYTICS_PROVIDER: z.enum(["none", "plausible"]).default("none"),
  PLAUSIBLE_DOMAIN: z.string().default(""),
  PLAUSIBLE_SCRIPT_URL: z.url().default("https://plausible.io/js/script.js"),
  /**
   * Secret for the first-party, cookie-free visitor hash (AS-19). Empty = a
   * random per-process secret, so unique counts reset on restart.
   */
  ANALYTICS_SALT: z.string().default(""),
});

export function formatEnvIssues(error: z.ZodError): string {
  const issues = error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  return `Invalid environment configuration:\n${issues}\nSee .env.example.`;
}
