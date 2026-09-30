"use server";

import { publicReviewSchema } from "@/domain/validation/public-review";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger";
import { clientIpKey } from "@/server/request";
import { submitCustomerReview } from "@/server/reviews/submit";

export type ReviewField = "customerName" | "body" | "rating";

/**
 * Errors are returned as codes (not text) so the form can show them in the
 * page's language; Server Actions can't read the [lang] root param.
 */
export type ReviewFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; code: "invalid" | "rate_limited" | "failed"; fields?: ReviewField[] };

/** Public Server Action: validated, rate limited, honeypot-protected. */
export async function submitReview(_prev: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  // Honeypot: real users never see or fill this field.
  if (String(formData.get("website") ?? "") !== "") return { status: "success" };

  const parsed = publicReviewSchema.safeParse({
    customerName: formData.get("customerName"),
    body: formData.get("body"),
    rating: formData.get("rating") ?? "",
  });
  if (!parsed.success) {
    const fields = [
      ...new Set(
        parsed.error.issues
          .map((issue) => String(issue.path[0] ?? ""))
          .filter((k): k is ReviewField => k === "customerName" || k === "body" || k === "rating"),
      ),
    ];
    return { status: "error", code: "invalid", fields };
  }

  try {
    const result = await submitCustomerReview(db(), parsed.data, await clientIpKey());
    return result.ok ? { status: "success" } : { status: "error", code: "rate_limited" };
  } catch (err) {
    logger.error("review submission failed", { err });
    return { status: "error", code: "failed" };
  }
}
