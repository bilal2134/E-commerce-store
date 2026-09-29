import "server-only";
import { envSchema, formatEnvIssues } from "./env-schema";
import type { z } from "zod";

/**
 * Typed, validated server configuration. All environment access goes through
 * here; nothing else in the app reads `process.env` directly (scripts and
 * config files excepted). Values are server-only: anything the browser needs
 * is passed down as props so a single build artifact can run in any
 * environment.
 */

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) throw new Error(formatEnvIssues(parsed.error));
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
