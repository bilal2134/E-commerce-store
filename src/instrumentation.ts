/**
 * Runs once when the server starts: fail fast on invalid configuration and
 * warn about production settings that weaken abuse protection.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { envSchema, formatEnvIssues } = await import("./server/config/env-schema");
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) throw new Error(formatEnvIssues(parsed.error));
  const e = parsed.data;
  if (e.NODE_ENV === "production" && !e.ANALYTICS_SALT) {
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "ANALYTICS_SALT is not set: unique-visitor counts use a per-process secret (they reset on restart and differ between instances) and stored IP keys are unsalted hashes.",
      }),
    );
  }
  if (e.NODE_ENV === "production" && !e.CLIENT_IP_HEADER) {
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "CLIENT_IP_HEADER is not set: login, review and analytics limits fall back to shared buckets, and unique-visitor counts only distinguish browsers. Set it to the header your proxy/CDN writes (see docs/architecture/security.md).",
      }),
    );
  }
}
