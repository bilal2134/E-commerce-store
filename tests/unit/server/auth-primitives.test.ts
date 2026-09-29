import { describe, expect, it } from "vitest";
import {
  dummyPasswordHash,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
} from "@/server/auth/password";
import { generateSessionToken, hashToken, sha256Hex } from "@/server/auth/tokens";

describe("tokens", () => {
  it("generates 256-bit base64url tokens", () => {
    const t = generateSessionToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(t, "base64url")).toHaveLength(32);
  });
  it("generates unique tokens", () => {
    const set = new Set(Array.from({ length: 500 }, generateSessionToken));
    expect(set.size).toBe(500);
  });
  it("hashToken is deterministic 64-char hex and differs from the token", () => {
    const t = generateSessionToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).not.toBe(t);
    expect(hashToken(t)).not.toBe(hashToken(generateSessionToken()));
  });
  it("hashToken matches the SHA-256 known vector", () => {
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex("abc")).toBe(hashToken("abc"));
  });
});

describe("password", () => {
  it("rejects too short and too long passwords", () => {
    expect(() => hashPassword("short")).toThrow();
    expect(() => hashPassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).toThrow();
    expect(() => hashPassword("a".repeat(MAX_PASSWORD_LENGTH + 1))).toThrow();
  });

  it("produces an argon2id PHC string with OWASP params", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(h).not.toContain("correct horse");
  });

  it("uses a random salt", async () => {
    const [a, b] = await Promise.all([hashPassword("same-password-123"), hashPassword("same-password-123")]);
    expect(a).not.toBe(b);
  });

  it("verifies right, wrong, empty, oversized and garbage", async () => {
    const h = await hashPassword("correct horse battery");
    expect(await verifyPassword(h, "correct horse battery")).toBe(true);
    expect(await verifyPassword(h, "correct horse batterY")).toBe(false);
    expect(await verifyPassword(h, "")).toBe(false);
    expect(await verifyPassword(h, "a".repeat(MAX_PASSWORD_LENGTH + 1))).toBe(false);
    expect(await verifyPassword("not-a-hash", "correct horse battery")).toBe(false);
    expect(await verifyPassword("", "correct horse battery")).toBe(false);
  });

  it("dummyPasswordHash is a memoised valid hash", async () => {
    const a = await dummyPasswordHash();
    expect(a).toMatch(/^\$argon2id\$/);
    expect(await dummyPasswordHash()).toBe(a);
  });
});
