import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { changeAdminPassword, listActiveSessions } from "@/server/admin/account";
import { AdminError } from "@/server/admin/errors";
import { authenticateAdmin } from "@/server/auth/login";
import { hashPassword } from "@/server/auth/password";
import { createSession, revokeOtherSessions, validateSessionToken } from "@/server/auth/session";
import { hashToken } from "@/server/auth/tokens";
import { closeDb, resetDb, schema, testDb } from "@tests/helpers/db";

const db = testDb();
const PASSWORD = "correct horse battery";
let adminId: string;

beforeEach(async () => {
  await resetDb();
  const [admin] = await db
    .insert(schema.adminUsers)
    .values({ email: "owner@usba.test", name: "Owner", passwordHash: await hashPassword(PASSWORD) })
    .returning();
  adminId = admin!.id;
});
afterAll(closeDb);

describe("changeAdminPassword", () => {
  it("changes the password and signs out every other session", async () => {
    const mine = await createSession(db, adminId, "mine");
    const other = await createSession(db, adminId, "other");
    const result = await changeAdminPassword(db, {
      adminId,
      currentPassword: PASSWORD,
      newPassword: "a brand new passphrase",
      keepSessionId: hashToken(mine.token),
    });
    expect(result.revoked).toBe(1);
    expect(await validateSessionToken(db, mine.token)).not.toBeNull();
    expect(await validateSessionToken(db, other.token)).toBeNull();
    expect(
      await authenticateAdmin(db, { email: "owner@usba.test", password: PASSWORD, ipKey: "t" }),
    ).toMatchObject({
      ok: false,
    });
    expect(
      await authenticateAdmin(db, {
        email: "owner@usba.test",
        password: "a brand new passphrase",
        ipKey: "t",
      }),
    ).toMatchObject({ ok: true });
  });

  it("rejects a wrong current password without changing anything", async () => {
    const other = await createSession(db, adminId, "other");
    await expect(
      changeAdminPassword(db, {
        adminId,
        currentPassword: "wrong wrong wrong",
        newPassword: "a brand new passphrase",
        keepSessionId: null,
      }),
    ).rejects.toBeInstanceOf(AdminError);
    expect(await validateSessionToken(db, other.token)).not.toBeNull();
    expect(
      await authenticateAdmin(db, { email: "owner@usba.test", password: PASSWORD, ipKey: "t" }),
    ).toMatchObject({
      ok: true,
    });
  });

  it("is rate limited", async () => {
    for (let i = 0; i < 10; i++) {
      await changeAdminPassword(db, {
        adminId,
        currentPassword: "wrong wrong wrong",
        newPassword: "a brand new passphrase",
        keepSessionId: null,
      }).catch(() => {});
    }
    await expect(
      changeAdminPassword(db, {
        adminId,
        currentPassword: PASSWORD,
        newPassword: "a brand new passphrase",
        keepSessionId: null,
      }),
    ).rejects.toThrow(/Too many attempts/);
  });
});

describe("sessions", () => {
  it("lists active sessions and revokes all others", async () => {
    const a = await createSession(db, adminId, "Mozilla/5.0 (Windows NT 10.0) Chrome/150");
    await createSession(db, adminId, "Mozilla/5.0 (iPhone) Safari/605");
    expect(await listActiveSessions(db, adminId)).toHaveLength(2);
    expect(await revokeOtherSessions(db, adminId, hashToken(a.token))).toBe(1);
    const left = await listActiveSessions(db, adminId);
    expect(left.map((s) => s.id)).toEqual([hashToken(a.token)]);
  });
});
