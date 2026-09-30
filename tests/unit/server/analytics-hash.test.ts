import { describe, expect, it } from "vitest";
import { isBotUserAgent, utcDay, visitorDayHash } from "@/server/analytics/hash";

const base = { secret: "s3cret", day: "2026-09-30", ipKey: "ip1", userAgent: "Mozilla/5.0", host: "usba.pk" };

describe("visitorDayHash", () => {
  it("is 32 hex chars and deterministic", () => {
    const h = visitorDayHash(base);
    expect(h).toMatch(/^[0-9a-f]{32}$/);
    expect(visitorDayHash(base)).toBe(h);
  });

  it("changes with day, ip, user agent, host and secret", () => {
    const h = visitorDayHash(base);
    for (const over of [
      { day: "2026-10-01" },
      { ipKey: "ip2" },
      { userAgent: "Other" },
      { host: "example.com" },
      { secret: "different" },
    ]) {
      expect(visitorDayHash({ ...base, ...over })).not.toBe(h);
    }
  });

  it("falls back to a stable per-process secret when none is configured", () => {
    const a = visitorDayHash({ ...base, secret: "" });
    expect(visitorDayHash({ ...base, secret: "" })).toBe(a);
    expect(a).not.toBe(visitorDayHash(base));
  });
});

describe("isBotUserAgent", () => {
  it("flags bots and empty agents but not browsers", () => {
    expect(isBotUserAgent("")).toBe(true);
    expect(isBotUserAgent("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe(true);
    expect(isBotUserAgent("curl/8.0")).toBe(true);
    expect(
      isBotUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile"),
    ).toBe(false);
  });
});

describe("utcDay", () => {
  it("formats YYYY-MM-DD in UTC", () => {
    expect(utcDay(new Date("2026-09-30T23:59:59Z"))).toBe("2026-09-30");
  });
});
