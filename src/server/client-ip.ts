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
