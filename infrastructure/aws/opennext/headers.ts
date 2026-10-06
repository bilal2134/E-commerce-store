/** Drops Content-Length (any casing) once a response body is re-encoded. */
export function withoutContentLength(headers: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(headers).filter(([k]) => k.toLowerCase() !== "content-length"));
}
