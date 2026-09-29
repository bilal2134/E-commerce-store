import "server-only";
import { and, eq, gt, lt, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isHttpsSite } from "../config/env";
import { db, type Database } from "../db/client";
import { adminSessions, adminUsers } from "../db/schema";
import { generateSessionToken, hashToken } from "./tokens";

/**
 * Admin sessions (AS-01, AS-20).
 * - Opaque 256-bit token in an HttpOnly cookie; only SHA-256(token) is stored.
 * - Absolute lifetime 24h from login, never extended.
 * - Idle timeout 8h (defence in depth for an unattended browser).
 * - Logout deletes the server-side row, so a copied cookie stops working.
 * Every admin page and Server Action calls requireAdmin(); the proxy only
 * does an optimistic cookie-presence redirect and is never trusted.
 */

export const SESSION_ABSOLUTE_TTL_MS = 24 * 60 * 60 * 1000;
export const SESSION_IDLE_TTL_MS = 8 * 60 * 60 * 1000;
const LAST_SEEN_WRITE_INTERVAL_MS = 5 * 60 * 1000;

/** `__Host-` prefix pins the cookie to this exact origin over HTTPS. */
export function sessionCookieName(): string {
  return isHttpsSite() ? "__Host-usba_admin" : "usba_admin";
}

export interface AdminIdentity {
  id: string;
  email: string;
  name: string;
}

export async function createSession(
  database: Database,
  adminId: string,
  userAgent: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_ABSOLUTE_TTL_MS);
  await database.transaction(async (tx) => {
    // Clean up this admin's expired sessions while we're here.
    await tx
      .delete(adminSessions)
      .where(and(eq(adminSessions.adminId, adminId), lt(adminSessions.expiresAt, new Date(now))));
    await tx.insert(adminSessions).values({ id: hashToken(token), adminId, expiresAt, userAgent });
  });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(sessionCookieName(), token, {
    httpOnly: true,
    secure: isHttpsSite(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function validateSessionToken(database: Database, token: string): Promise<AdminIdentity | null> {
  const id = hashToken(token);
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - SESSION_IDLE_TTL_MS);
  const rows = await database
    .select({
      sessionId: adminSessions.id,
      lastSeenAt: adminSessions.lastSeenAt,
      adminId: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminId))
    .where(
      and(
        eq(adminSessions.id, id),
        gt(adminSessions.expiresAt, now),
        gt(adminSessions.lastSeenAt, idleCutoff),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (now.getTime() - row.lastSeenAt.getTime() > LAST_SEEN_WRITE_INTERVAL_MS) {
    await database.update(adminSessions).set({ lastSeenAt: now }).where(eq(adminSessions.id, id));
  }
  return { id: row.adminId, email: row.email, name: row.name };
}

/** Current admin for this request (memoised per render), or null. */
export const getCurrentAdmin = cache(async (): Promise<AdminIdentity | null> => {
  const token = (await cookies()).get(sessionCookieName())?.value;
  if (!token || token.length > 100) return null;
  return validateSessionToken(db(), token);
});

/** Gate for every admin page and every admin Server Action. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin");
  return admin;
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (token) {
    await db()
      .delete(adminSessions)
      .where(eq(adminSessions.id, hashToken(token)));
  }
  jar.delete(sessionCookieName());
}

/** Housekeeping for expired/idle sessions. */
export async function pruneSessions(database: Database): Promise<void> {
  const idleCutoff = new Date(Date.now() - SESSION_IDLE_TTL_MS);
  await database
    .delete(adminSessions)
    .where(or(lt(adminSessions.expiresAt, sql`now()`), lt(adminSessions.lastSeenAt, idleCutoff)));
}
