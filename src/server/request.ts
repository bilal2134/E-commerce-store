import "server-only";
import { headers } from "next/headers";
import { env } from "./config/env";
import { sha256Hex } from "./auth/tokens";
import { pickClientIp } from "./client-ip";

/**
 * Client IP from the header configured in CLIENT_IP_HEADER, read from the
 * right by CLIENT_IP_TRUSTED_HOPS so spoofed X-Forwarded-For prefixes are
 * ignored (see pickClientIp). Returned hashed so raw IPs are never persisted.
 */
export async function clientIpKey(): Promise<string> {
  const { CLIENT_IP_HEADER, CLIENT_IP_TRUSTED_HOPS } = env();
  if (!CLIENT_IP_HEADER) return "unknown";
  const ip = pickClientIp((await headers()).get(CLIENT_IP_HEADER), CLIENT_IP_TRUSTED_HOPS);
  return ip ? sha256Hex(`ip:${ip}`).slice(0, 32) : "unknown";
}

export async function userAgent(): Promise<string> {
  return ((await headers()).get("user-agent") ?? "").slice(0, 300);
}
