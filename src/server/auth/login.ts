import "server-only";
import { eq, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { adminUsers } from "../db/schema";
import { dummyPasswordHash, verifyPassword } from "./password";
import {
  consumeRateLimit,
  peekRateLimit,
  pruneRateLimits,
  shouldRunHousekeeping,
  windowRetryAfter,
} from "./rate-limit";
import { pruneSessions } from "./session";
import { sha256Hex } from "./tokens";

const WINDOW = 15 * 60;

/**
 * Brute-force limits (docs/architecture/security.md):
 * - perIp: every attempt from one client IP (skipped when the IP is unknown,
 *   so one shared bucket can't lock everybody out).
 * - failuresPerAccountIp: *failed* attempts for one account from one IP —
 *   the tight limit an attacker hits.
 * - failuresPerAccount: failed attempts for one account from anywhere — a
 *   loose global cap. Successful logins never count, so an attacker cannot
 *   lock the owner out by spending the owner's budget from their own IP.
 */
export const LOGIN_LIMITS = {
  perIp: { limit: 20, windowSeconds: WINDOW },
  failuresPerAccountIp: { limit: 8, windowSeconds: WINDOW },
  failuresPerAccount: { limit: 100, windowSeconds: WINDOW },
} as const;

export type LoginResult =
  | { ok: true; adminId: string }
  | { ok: false; reason: "invalid_credentials" }
  | { ok: false; reason: "rate_limited"; retryAfterSeconds: number };

/**
 * Credential check with brute-force throttling. Error results are generic
 * (no "unknown email" vs "wrong password" distinction), and unknown emails
 * still pay the Argon2 cost.
 */
export async function authenticateAdmin(
  database: Database,
  input: { email: string; password: string; ipKey: string },
): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  const accountKey = sha256Hex(email).slice(0, 32);
  const failAccountIpKey = `login:fail:${accountKey}:${input.ipKey}`;
  const failAccountKey = `login:fail:${accountKey}`;

  if (shouldRunHousekeeping()) {
    await Promise.all([pruneRateLimits(database), pruneSessions(database)]).catch(() => {});
  }

  if (input.ipKey !== "unknown") {
    const ip = await consumeRateLimit(
      database,
      `login:ip:${input.ipKey}`,
      LOGIN_LIMITS.perIp.limit,
      LOGIN_LIMITS.perIp.windowSeconds,
    );
    if (!ip.allowed) return { ok: false, reason: "rate_limited", retryAfterSeconds: ip.retryAfterSeconds };
  }

  const [accountIpFailures, accountFailures] = await Promise.all([
    peekRateLimit(database, failAccountIpKey, WINDOW),
    peekRateLimit(database, failAccountKey, WINDOW),
  ]);
  if (
    accountIpFailures >= LOGIN_LIMITS.failuresPerAccountIp.limit ||
    accountFailures >= LOGIN_LIMITS.failuresPerAccount.limit
  ) {
    return { ok: false, reason: "rate_limited", retryAfterSeconds: windowRetryAfter(WINDOW) };
  }

  const [admin] = await database
    .select({ id: adminUsers.id, passwordHash: adminUsers.passwordHash })
    .from(adminUsers)
    .where(eq(sql`lower(${adminUsers.email})`, email))
    .limit(1);

  const valid = admin
    ? await verifyPassword(admin.passwordHash, input.password)
    : await verifyPassword(await dummyPasswordHash(), input.password).then(() => false);

  if (!admin || !valid) {
    await Promise.all([
      consumeRateLimit(database, failAccountIpKey, LOGIN_LIMITS.failuresPerAccountIp.limit, WINDOW),
      consumeRateLimit(database, failAccountKey, LOGIN_LIMITS.failuresPerAccount.limit, WINDOW),
    ]);
    return { ok: false, reason: "invalid_credentials" };
  }

  await database.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, admin.id));
  return { ok: true, adminId: admin.id };
}
