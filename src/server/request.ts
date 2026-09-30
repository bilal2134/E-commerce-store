import "server-only";
import { headers } from "next/headers";
import { env } from "./config/env";
import { createHmac } from "node:crypto";
import { sha256Hex } from "./auth/tokens";
import { ipLimitSubject, pickClientIp } from "./client-ip";

/**
 * Client IP from the header configured in CLIENT_IP_HEADER, read from the
 * right by CLIENT_IP_TRUSTED_HOPS so spoofed X-Forwarded-For prefixes are
 * ignored (see pickClientIp). IPv6 is keyed by its /64. Raw IPs are never
 * persisted: with ANALYTICS_SALT set the key is an HMAC, so stored keys can't
 * be brute-forced back to addresses; without it a plain SHA-256 keeps rate
 * limits consistent across instances and restarts.
 */
export async function clientIpKey(): Promise<string> {
  const { CLIENT_IP_HEADER, CLIENT_IP_TRUSTED_HOPS, ANALYTICS_SALT } = env();
  if (!CLIENT_IP_HEADER) return "unknown";
  const ip = pickClientIp((await headers()).get(CLIENT_IP_HEADER), CLIENT_IP_TRUSTED_HOPS);
  if (!ip) return "unknown";
  const subject = `ip:${ipLimitSubject(ip)}`;
  const digest = ANALYTICS_SALT
    ? createHmac("sha256", ANALYTICS_SALT).update(subject).digest("hex")
    : sha256Hex(subject);
  return digest.slice(0, 32);
}

export async function userAgent(): Promise<string> {
  return ((await headers()).get("user-agent") ?? "").slice(0, 300);
}
