import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// session.ts imports these at module top level; the functions under test never call them.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { authenticateAdmin, LOGIN_LIMITS } from "@/server/auth/login";
import { hashPassword } from "@/server/auth/password";
import { consumeRateLimit, pruneRateLimits } from "@/server/auth/rate-limit";
import {
  createSession,
  pruneSessions,
  SESSION_ABSOLUTE_TTL_MS,
  SESSION_IDLE_TTL_MS,
  validateSessionToken,
} from "@/server/auth/session";
import { hashToken } from "@/server/auth/tokens";
import { closeDb, resetDb, schema, testDb, testSql } from "@tests/helpers/db";

const db = testDb();
const PASSWORD = "correct horse battery";
let adminId: string;

beforeAll(async () => {
  await resetDb();
});
beforeEach(async () => {
  await resetDb();
  const [admin] = await db
    .insert(schema.adminUsers)
    .values({ email: "Owner@Usba.test", name: "Owner", passwordHash: await hashPassword(PASSWORD) })
    .returning();
  adminId = admin!.id;
});
afterAll(closeDb);

describe("consumeRateLimit", () => {
  it("allows up to the limit then blocks", async () => {
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await consumeRateLimit(db, "k", 3, 900));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false, false]);
    expect(results.map((r) => r.count)).toEqual([1, 2, 3, 4, 5]);
  });
  it("counts per key independently", async () => {
    for (let i = 0; i < 3; i++) await consumeRateLimit(db, "a", 3, 900);
    expect((await consumeRateLimit(db, "a", 3, 900)).allowed).toBe(false);
    expect((await consumeRateLimit(db, "b", 3, 900)).allowed).toBe(true);
  });
  it("reports retryAfterSeconds within the window", async () => {
    const r = await consumeRateLimit(db, "k", 1, 900);
    expect(r.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(r.retryAfterSeconds).toBeLessThanOrEqual(900);
  });
  it("is atomic under concurrency", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => consumeRateLimit(db, "c", 4, 900)));
    expect(results.filter((r) => r.allowed)).toHaveLength(4);
    expect(new Set(results.map((r) => r.count)).size).toBe(10);
  });
  it("pruneRateLimits removes windows older than a day only", async () => {
    await consumeRateLimit(db, "fresh", 5, 900);
    await testSql()`insert into rate_limits (key, window_start, count) values ('old', now() - interval '2 days', 1)`;
    await pruneRateLimits(db);
    const keys = (await db.select().from(schema.rateLimits)).map((r) => r.key);
    expect(keys).toEqual(["fresh"]);
  });
});

describe("sessions", () => {
  it("valid token yields the admin identity", async () => {
    const { token, expiresAt } = await createSession(db, adminId, "vitest");
    expect(await validateSessionToken(db, token)).toEqual({
      id: adminId,
      email: "Owner@Usba.test",
      name: "Owner",
    });
    const remaining = expiresAt.getTime() - Date.now();
    expect(remaining).toBeGreaterThan(SESSION_ABSOLUTE_TTL_MS - 60_000);
    expect(remaining).toBeLessThanOrEqual(SESSION_ABSOLUTE_TTL_MS);
  });
  it("stores only the SHA-256 of the token", async () => {
    const { token } = await createSession(db, adminId, "vitest");
    const rows = await db.select().from(schema.adminSessions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).not.toBe(token);
    expect(rows[0]?.id).toBe(hashToken(token));
    expect(rows[0]?.userAgent).toBe("vitest");
    expect(JSON.stringify(rows)).not.toContain(token);
  });
  it("rejects wrong, empty and hash-as-token values", async () => {
    const { token } = await createSession(db, adminId, "ua");
    expect(await validateSessionToken(db, token + "x")).toBeNull();
    expect(await validateSessionToken(db, "")).toBeNull();
    expect(await validateSessionToken(db, hashToken(token))).toBeNull();
  });
  it("rejects an expired session", async () => {
    const { token } = await createSession(db, adminId, "ua");
    await db.update(schema.adminSessions).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await validateSessionToken(db, token)).toBeNull();
  });
  it("rejects an idle session (last seen > 8h ago)", async () => {
    const { token } = await createSession(db, adminId, "ua");
    await db
      .update(schema.adminSessions)
      .set({ lastSeenAt: new Date(Date.now() - SESSION_IDLE_TTL_MS - 60_000) });
    expect(await validateSessionToken(db, token)).toBeNull();
  });
  it("accepts a session seen just under the idle limit and refreshes last_seen_at", async () => {
    const { token } = await createSession(db, adminId, "ua");
    const stale = new Date(Date.now() - SESSION_IDLE_TTL_MS + 60_000);
    await db.update(schema.adminSessions).set({ lastSeenAt: stale });
    expect(await validateSessionToken(db, token)).not.toBeNull();
    const [row] = await db.select().from(schema.adminSessions);
    expect(row!.lastSeenAt.getTime()).toBeGreaterThan(stale.getTime() + 60_000);
  });
  it("does not write last_seen_at on every request", async () => {
    const { token } = await createSession(db, adminId, "ua");
    const [before] = await db.select().from(schema.adminSessions);
    await validateSessionToken(db, token);
    const [after] = await db.select().from(schema.adminSessions);
    expect(after!.lastSeenAt.getTime()).toBe(before!.lastSeenAt.getTime());
  });
  it("is invalid after the session row is deleted (logout)", async () => {
    const { token } = await createSession(db, adminId, "ua");
    await db.delete(schema.adminSessions).where(eq(schema.adminSessions.id, hashToken(token)));
    expect(await validateSessionToken(db, token)).toBeNull();
  });
  it("is invalid once the admin is deleted (cascade)", async () => {
    const { token } = await createSession(db, adminId, "ua");
    await db.delete(schema.adminUsers).where(eq(schema.adminUsers.id, adminId));
    expect(await validateSessionToken(db, token)).toBeNull();
    expect(await db.select().from(schema.adminSessions)).toHaveLength(0);
  });
  it("createSession removes this admin's expired sessions", async () => {
    const old = await createSession(db, adminId, "old");
    await db.update(schema.adminSessions).set({ expiresAt: new Date(Date.now() - 1000) });
    await createSession(db, adminId, "new");
    const rows = await db.select().from(schema.adminSessions);
    expect(rows.map((r) => r.userAgent)).toEqual(["new"]);
    expect(await validateSessionToken(db, old.token)).toBeNull();
  });
  it("pruneSessions removes expired and idle sessions but keeps live ones", async () => {
    const live = await createSession(db, adminId, "live");
    const expired = await createSession(db, adminId, "expired");
    const idle = await createSession(db, adminId, "idle");
    await db
      .update(schema.adminSessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.adminSessions.id, hashToken(expired.token)));
    await db
      .update(schema.adminSessions)
      .set({ lastSeenAt: new Date(Date.now() - SESSION_IDLE_TTL_MS - 1000) })
      .where(eq(schema.adminSessions.id, hashToken(idle.token)));
    await pruneSessions(db);
    const rows = await db.select().from(schema.adminSessions);
    expect(rows.map((r) => r.userAgent)).toEqual(["live"]);
    expect(await validateSessionToken(db, live.token)).not.toBeNull();
  });
});

describe("authenticateAdmin", () => {
  const login = (over: Partial<{ email: string; password: string; ipKey: string }> = {}) =>
    authenticateAdmin(db, { email: "owner@usba.test", password: PASSWORD, ipKey: "1.1.1.1", ...over });

  it("succeeds with correct credentials and records last login", async () => {
    expect(await login()).toEqual({ ok: true, adminId });
    const [admin] = await db.select().from(schema.adminUsers);
    expect(admin?.lastLoginAt).toBeInstanceOf(Date);
  });
  it("matches email case-insensitively and ignores surrounding whitespace", async () => {
    expect(await login({ email: "  OWNER@USBA.TEST " })).toEqual({ ok: true, adminId });
  });
  it("rejects a wrong password with a generic error", async () => {
    expect(await login({ password: "wrong password here" })).toEqual({
      ok: false,
      reason: "invalid_credentials",
    });
    const [admin] = await db.select().from(schema.adminUsers);
    expect(admin?.lastLoginAt).toBeNull();
  });
  it("rejects an unknown email with the same generic error", async () => {
    expect(await login({ email: "nobody@usba.test" })).toEqual({ ok: false, reason: "invalid_credentials" });
  });
  it("rejects an empty password", async () => {
    expect(await login({ password: "" })).toEqual({ ok: false, reason: "invalid_credentials" });
  });
  it("rate limits an account after 8 attempts, even across IPs", async () => {
    expect(LOGIN_LIMITS.perAccount.limit).toBe(8);
    for (let i = 0; i < 8; i++) {
      const r = await login({ password: "wrong password here", ipKey: `10.0.0.${i}` });
      expect(r).toEqual({ ok: false, reason: "invalid_credentials" });
    }
    const blocked = await login({ ipKey: "10.0.1.1" });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.reason).toBe("rate_limited");
      if (blocked.reason === "rate_limited") {
        expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
        expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(900);
      }
    }
  });
  it("does not let a different account's attempts block this one", async () => {
    for (let i = 0; i < 8; i++) await login({ email: "other@usba.test", ipKey: `10.1.0.${i}` });
    expect((await login({ email: "other@usba.test", ipKey: "10.1.1.1" })).ok).toBe(false);
    expect(await login({ ipKey: "10.1.2.2" })).toEqual({ ok: true, adminId });
  });
  it("rate limits a single IP after 20 attempts", async () => {
    for (let i = 0; i < 20; i++) await login({ email: `user${i}@usba.test`, password: "nope nope nope" });
    const r = await login({ email: "fresh@usba.test" });
    expect(r).toMatchObject({ ok: false, reason: "rate_limited" });
  });
}, 120_000);
