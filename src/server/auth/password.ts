import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id with the library defaults, which equal the OWASP recommendation
 * (m=19456 KiB, t=2, p=1). Parameters are encoded in the PHC string, so they
 * can be raised later without invalidating existing hashes.
 */

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export function hashPassword(password: string): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters`);
  }
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  if (password.length === 0 || password.length > MAX_PASSWORD_LENGTH) return false;
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * Hash of a random throwaway password, verified when the email is unknown so
 * both branches of login take comparable time (no user enumeration).
 */
let dummyHash: Promise<string> | undefined;
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hash(`dummy-${Math.random().toString(36)}-password`);
  return dummyHash;
}
