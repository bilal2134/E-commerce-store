"use server";

import { publicReviewSchema } from "@/domain/validation/public-review";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger";
import { clientIpKey } from "@/server/request";
import { submitCustomerReview } from "@/server/reviews/submit";

export type ReviewFormState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<"customerName" | "body" | "rating", string>>;
    };

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
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  try {
    const result = await submitCustomerReview(db(), parsed.data, await clientIpKey());
    if (!result.ok) {
      return { status: "error", message: "You've sent several reviews recently. Please try again later." };
    }
    return { status: "success" };
  } catch (err) {
    logger.error("review submission failed", { err });
    return { status: "error", message: "Your review couldn't be sent. Please try again in a moment." };
  }
}
