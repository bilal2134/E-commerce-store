import "server-only";
import { headers } from "next/headers";
import { env } from "./config/env";
import { sha256Hex } from "./auth/tokens";

/**
 * Client IP from the header configured in CLIENT_IP_HEADER (trusted only
 * because our own proxy/CDN sets it). Returned hashed so raw IPs are never
 * persisted.
 */
export async function clientIpKey(): Promise<string> {
  const headerName = env().CLIENT_IP_HEADER;
  if (!headerName) return "unknown";
  const raw = (await headers()).get(headerName) ?? "";
  const ip = raw.split(",")[0]?.trim() ?? "";
  return ip ? sha256Hex(`ip:${ip}`).slice(0, 32) : "unknown";
}

export async function userAgent(): Promise<string> {
  return ((await headers()).get("user-agent") ?? "").slice(0, 300);
}
