import { describe, expect, it } from "vitest";
import { pickClientIp } from "@/server/client-ip";

describe("pickClientIp", () => {
  it("reads X-Forwarded-For from the right, ignoring spoofed prefixes", () => {
    expect(pickClientIp("6.6.6.6, 203.0.113.9", 1)).toBe("203.0.113.9");
    expect(pickClientIp("6.6.6.6, 203.0.113.9, 10.0.0.2", 2)).toBe("203.0.113.9");
  });
  it("handles single-value edge headers", () => {
    expect(pickClientIp("198.51.100.4", 1)).toBe("198.51.100.4");
    expect(pickClientIp("2001:db8::1", 1)).toBe("2001:db8::1");
  });
  it("clamps hops beyond the list length to the leftmost entry", () => {
    expect(pickClientIp("198.51.100.4", 3)).toBe("198.51.100.4");
  });
  it("rejects empty or malformed values", () => {
    expect(pickClientIp(null, 1)).toBeNull();
    expect(pickClientIp(" , ", 1)).toBeNull();
    expect(pickClientIp("not-an-ip<script>", 1)).toBeNull();
  });
});

describe("ipLimitSubject", () => {
  it("keeps IPv4 and reduces IPv6 to its /64", async () => {
    const { ipLimitSubject } = await import("@/server/client-ip");
    expect(ipLimitSubject("203.0.113.9")).toBe("203.0.113.9");
    expect(ipLimitSubject("2001:db8:abcd:12::1")).toBe("2001:db8:abcd:12::/64");
    expect(ipLimitSubject("2001:0db8:abcd:0012:ffff:1:2:3")).toBe("2001:db8:abcd:12::/64");
    expect(ipLimitSubject("::1")).toBe("0:0:0:0::/64");
  });
});
