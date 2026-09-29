import { createHash, randomBytes } from "node:crypto";

/** 256-bit random session token, base64url (goes in the cookie only). */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Session IDs stored in the DB are SHA-256(token): a DB leak yields no usable cookies. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
