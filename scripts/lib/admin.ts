import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../../src/server/auth/password";
import * as s from "../../src/server/db/schema";

/**
 * Creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD, or resets its
 * password if it already exists. Skips silently when ADMIN_PASSWORD is unset.
 */
export async function ensureAdmin(db: PostgresJsDatabase<typeof s>): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || !password) {
    console.log("ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin account.");
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  const passwordHash = await hashPassword(password);
  const [existing] = await db
    .select({ id: s.adminUsers.id })
    .from(s.adminUsers)
    .where(eq(sql`lower(${s.adminUsers.email})`, email));
  if (existing) {
    await db.update(s.adminUsers).set({ passwordHash }).where(eq(s.adminUsers.id, existing.id));
    // Password change invalidates every existing session.
    await db.delete(s.adminSessions).where(eq(s.adminSessions.adminId, existing.id));
    console.log(`Admin ${email}: password updated, sessions revoked.`);
  } else {
    await db.insert(s.adminUsers).values({ email, name: "Owner", passwordHash });
    console.log(`Admin ${email}: created.`);
  }
}
