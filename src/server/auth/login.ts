import "server-only";
import { eq, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { adminUsers } from "../db/schema";
import { dummyPasswordHash, verifyPassword } from "./password";
import { consumeRateLimit } from "./rate-limit";
import { sha256Hex } from "./tokens";

export const LOGIN_LIMITS = {
  perIp: { limit: 20, windowSeconds: 15 * 60 },
  perAccount: { limit: 8, windowSeconds: 15 * 60 },
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

  const ipCheck = await consumeRateLimit(
    database,
    `login:ip:${input.ipKey}`,
    LOGIN_LIMITS.perIp.limit,
    LOGIN_LIMITS.perIp.windowSeconds,
  );
  const accountCheck = await consumeRateLimit(
    database,
    `login:acct:${sha256Hex(email).slice(0, 32)}`,
    LOGIN_LIMITS.perAccount.limit,
    LOGIN_LIMITS.perAccount.windowSeconds,
  );
  if (!ipCheck.allowed || !accountCheck.allowed) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: Math.max(
        ipCheck.allowed ? 0 : ipCheck.retryAfterSeconds,
        accountCheck.allowed ? 0 : accountCheck.retryAfterSeconds,
      ),
    };
  }

  const [admin] = await database
    .select({ id: adminUsers.id, passwordHash: adminUsers.passwordHash })
    .from(adminUsers)
    .where(eq(sql`lower(${adminUsers.email})`, email))
    .limit(1);

  if (!admin) {
    await verifyPassword(await dummyPasswordHash(), input.password);
    return { ok: false, reason: "invalid_credentials" };
  }
  const valid = await verifyPassword(admin.passwordHash, input.password);
  if (!valid) return { ok: false, reason: "invalid_credentials" };

  await database.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, admin.id));
  return { ok: true, adminId: admin.id };
}
