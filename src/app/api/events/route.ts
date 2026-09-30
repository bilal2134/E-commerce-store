import { headers } from "next/headers";
import { env } from "@/server/config/env";
import { db } from "@/server/db/client";
import { consumeRateLimit, pruneRateLimits, shouldRunHousekeeping } from "@/server/auth/rate-limit";
import { clientIpKey } from "@/server/request";
import { isBotUserAgent, utcDay, visitorDayHash } from "@/server/analytics/hash";
import {
  eventBodySchema,
  MAX_BODY_BYTES,
  pruneAnalyticsEvents,
  recordEvent,
} from "@/server/analytics/collect";

/**
 * First-party analytics collector (AS-19, ADR-0013). Always answers 204 so
 * nothing about validation or filtering leaks; stores no cookies, raw IP or UA.
 *
 * The Origin/Sec-Fetch-Site checks only filter cross-site *browser* requests;
 * scripts can omit those headers. Abuse is bounded instead by a per-IP limit,
 * an always-on global daily cap, and one stored row per visitor/event/day.
 */
const noContent = () => new Response(null, { status: 204 });

const WINDOW_SECONDS = 600;
const PER_IP_LIMIT = 120;
const GLOBAL_DAILY_LIMIT = 20_000;

async function readLimited(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES || !request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { SITE_URL, ANALYTICS_SALT } = env();
    const siteHost = new URL(SITE_URL).host;

    const site = request.headers.get("sec-fetch-site");
    if (site !== null && site !== "same-origin") return noContent();
    const origin = request.headers.get("origin");
    if (origin !== null) {
      let originHost: string | null = null;
      try {
        originHost = new URL(origin).host;
      } catch {
        // malformed Origin: treated as a mismatch
      }
      if (originHost !== siteHost) return noContent();
    }

    const userAgent = ((await headers()).get("user-agent") ?? "").slice(0, 300);
    if (isBotUserAgent(userAgent)) return noContent();

    const text = await readLimited(request);
    if (text === null) return noContent();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return noContent();
    }
    const parsed = eventBodySchema.safeParse(json);
    if (!parsed.success) return noContent();

    const database = db();
    const ipKey = await clientIpKey();
    if (ipKey !== "unknown") {
      const perIp = await consumeRateLimit(database, `events:ip:${ipKey}`, PER_IP_LIMIT, WINDOW_SECONDS);
      if (!perIp.allowed) return noContent();
    }
    const global = await consumeRateLimit(database, "events:global", GLOBAL_DAILY_LIMIT, 86_400);
    if (!global.allowed) return noContent();

    const hash = visitorDayHash({
      secret: ANALYTICS_SALT,
      day: utcDay(),
      ipKey,
      userAgent,
      host: siteHost,
    });
    await recordEvent(database, parsed.data, hash);
    if (shouldRunHousekeeping(500)) {
      await Promise.all([pruneAnalyticsEvents(database), pruneRateLimits(database)]);
    }
  } catch {
    // Analytics must never surface errors to visitors.
  }
  return noContent();
}
