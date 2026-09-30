import { createHash, createHmac, randomBytes } from "node:crypto";

/**
 * Cookie-free visitor hashing (Plausible-style). The hash changes every UTC
 * day because the salt does, so a visitor cannot be followed across days, and
 * neither the IP nor the user agent is ever stored.
 */

/** Used when ANALYTICS_SALT is empty; unique counts then reset on restart. */
const processSecret = randomBytes(32).toString("hex");

export function utcDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function dailySalt(secret: string, day: string): string {
  return createHmac("sha256", secret || processSecret)
    .update(day)
    .digest("hex");
}

export function visitorDayHash(input: {
  secret: string;
  day: string;
  ipKey: string;
  userAgent: string;
  host: string;
}): string {
  return createHash("sha256")
    .update(dailySalt(input.secret, input.day) + input.ipKey + input.userAgent + input.host)
    .digest("hex")
    .slice(0, 32);
}

const BOT_UA =
  /bot|crawl|spider|slurp|lighthouse|pagespeed|preview|monitor|uptime|curl\/|wget|python-requests|httpclient|okhttp|axios|node-fetch|go-http|facebookexternalhit|whatsapp|telegram|discord|scrapy/i;

/** Obvious bots and empty user agents; a courtesy filter, not a security control. */
export function isBotUserAgent(userAgent: string): boolean {
  return userAgent.trim() === "" || BOT_UA.test(userAgent);
}
