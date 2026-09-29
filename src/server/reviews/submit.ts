import "server-only";
import type { PublicReviewInput } from "@/domain/validation/public-review";
import { consumeRateLimit } from "../auth/rate-limit";
import type { Database } from "../db/client";
import { reviews } from "../db/schema";

export const REVIEW_LIMITS = {
  perIp: { limit: 3, windowSeconds: 60 * 60 },
  /** Shared bucket when no trusted client-IP header is configured. */
  shared: { limit: 30, windowSeconds: 60 * 60 },
} as const;

export type SubmitReviewResult = { ok: true } | { ok: false; reason: "rate_limited" };

/** Store a customer review as pending; it's only public after approval. */
export async function submitCustomerReview(
  database: Database,
  input: PublicReviewInput,
  ipKey: string,
): Promise<SubmitReviewResult> {
  const bucket = ipKey === "unknown" ? REVIEW_LIMITS.shared : REVIEW_LIMITS.perIp;
  const limit = await consumeRateLimit(database, `review:${ipKey}`, bucket.limit, bucket.windowSeconds);
  if (!limit.allowed) return { ok: false, reason: "rate_limited" };
  await database.insert(reviews).values({
    customerName: input.customerName,
    body: input.body,
    rating: input.rating ?? null,
    status: "pending",
    source: "customer",
  });
  return { ok: true };
}
