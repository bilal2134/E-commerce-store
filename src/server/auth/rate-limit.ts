import "server-only";
import { sql } from "drizzle-orm";
import type { Database } from "../db/client";

/**
 * Fixed-window rate limiter backed by Postgres (no Redis needed at this
 * scale). One atomic upsert per check.
 */
export interface RateLimitResult {
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
}

export async function consumeRateLimit(
  database: Database,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(nowMs / windowMs) * windowMs);
  const rows = await database.execute<{ count: number }>(sql`
    insert into rate_limits (key, window_start, count)
    values (${key}, ${windowStart.toISOString()}, 1)
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count
  `);
  const count = Number(rows[0]?.count ?? 1);
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart.getTime() + windowMs - nowMs) / 1000));
  return { allowed: count <= limit, count, retryAfterSeconds };
}

/** Housekeeping: drop windows older than a day. Called opportunistically. */
export async function pruneRateLimits(database: Database): Promise<void> {
  await database.execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`);
}
