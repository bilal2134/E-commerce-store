/**
 * Resolve the client IP from a proxy header without trusting client input.
 *
 * Proxies *append* to X-Forwarded-For, so its leftmost entries are whatever
 * the client sent. With `trustedHops` proxies in front of the app (each
 * appending one entry), the real client address is the entry `trustedHops`
 * positions from the right. Single-value headers set by the edge
 * (cf-connecting-ip, true-client-ip, x-real-ip) have one entry and resolve
 * to it.
 */
export function pickClientIp(headerValue: string | null, trustedHops: number): string | null {
  if (!headerValue) return null;
  const entries = headerValue
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (entries.length === 0) return null;
  const index = Math.max(0, entries.length - Math.max(1, trustedHops));
  const ip = entries[index] ?? null;
  // Basic sanity: IPv4/IPv6 characters only, bounded length.
  return ip && /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : null;
}

/**
 * The part of an address used for rate limiting: the full IPv4 address, or
 * the /64 prefix of an IPv6 address (one subscriber usually controls a whole
 * /64, so per-address limits would be trivial to rotate around).
 */
export function ipLimitSubject(ip: string): string {
  if (!ip.includes(":")) return ip;
  const [head = "", tail = ""] = ip.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const missing = Math.max(0, 8 - headParts.length - tailParts.length);
  const full = [...headParts, ...Array<string>(missing).fill("0"), ...tailParts];
  return `${full
    .slice(0, 4)
    .map((h) => (h || "0").toLowerCase().replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}
