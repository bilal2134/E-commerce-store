import "server-only";
import { and, desc, eq, gt } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../auth/password";
import { consumeRateLimit } from "../auth/rate-limit";
import { revokeOtherSessions } from "../auth/session";
import type { Database } from "../db/client";
import { adminSessions, adminUsers } from "../db/schema";
import { AdminError } from "./errors";

/**
 * Change the admin password (audit finding L5). Requires the current password,
 * is rate limited, and signs out every other session so a leaked session or
 * password stops working immediately.
 */
export async function changeAdminPassword(
  database: Database,
  input: { adminId: string; currentPassword: string; newPassword: string; keepSessionId: string | null },
): Promise<{ revoked: number }> {
  const limit = await consumeRateLimit(database, `pwchange:${input.adminId}`, 10, 15 * 60);
  if (!limit.allowed) throw new AdminError("Too many attempts. Try again in a few minutes.");

  const [admin] = await database
    .select({ passwordHash: adminUsers.passwordHash })
    .from(adminUsers)
    .where(eq(adminUsers.id, input.adminId))
    .limit(1);
  if (!admin || !(await verifyPassword(admin.passwordHash, input.currentPassword))) {
    throw new AdminError("Your current password is incorrect.", {
      currentPassword: "Your current password is incorrect.",
    });
  }
  const passwordHash = await hashPassword(input.newPassword);
  await database.update(adminUsers).set({ passwordHash }).where(eq(adminUsers.id, input.adminId));
  const revoked = await revokeOtherSessions(database, input.adminId, input.keepSessionId);
  return { revoked };
}

export interface SessionView {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  userAgent: string;
}

/** Active sessions for the admin, newest first (ids are hashes, never tokens). */
export async function listActiveSessions(database: Database, adminId: string): Promise<SessionView[]> {
  const rows = await database
    .select({
      id: adminSessions.id,
      createdAt: adminSessions.createdAt,
      lastSeenAt: adminSessions.lastSeenAt,
      expiresAt: adminSessions.expiresAt,
      userAgent: adminSessions.userAgent,
    })
    .from(adminSessions)
    .where(and(eq(adminSessions.adminId, adminId), gt(adminSessions.expiresAt, new Date())))
    .orderBy(desc(adminSessions.lastSeenAt));
  return rows;
}
