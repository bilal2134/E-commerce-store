"use server";

import { z } from "zod";
import { REVIEW_STATUSES } from "@/domain/reviews";
import { fieldErrorsFrom } from "@/domain/validation/common";
import { fail, type ActionResult } from "@/domain/validation/result";
import { adminReviewFromFormData, adminReviewSchema } from "@/domain/validation/review";
import { createAdminReview, deleteReview, setReviewStatus } from "@/server/admin/reviews";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { storage } from "@/server/storage";
import { readUpload, refreshAfterWrite, TAGS, toFailure } from "../../_lib/mutations";

export async function setReviewStatusAction(id: string, status: string): Promise<ActionResult> {
  await requireAdmin();
  const parsedStatus = z.enum(REVIEW_STATUSES).safeParse(status);
  if (!z.uuid().safeParse(id).success || !parsedStatus.success) return fail("Invalid request.");
  try {
    await setReviewStatus(db(), id, parsedStatus.data);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.reviews);
  const messages = {
    approved: "Review approved",
    rejected: "Review rejected",
    pending: "Review moved to pending",
  };
  return { ok: true, message: messages[parsedStatus.data] };
}

export async function deleteReviewAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail("Invalid request.");
  try {
    await deleteReview(db(), storage(), id);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.reviews);
  return { ok: true, message: "Review deleted" };
}

export async function createReviewAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = adminReviewSchema.safeParse(adminReviewFromFormData(formData));
  if (!parsed.success)
    return fail("Fix the highlighted fields and save again.", fieldErrorsFrom(parsed.error));
  try {
    const photo = await readUpload(formData, "photo");
    await createAdminReview(
      db(),
      storage(),
      {
        customerName: parsed.data.customerName,
        body: parsed.data.body,
        rating: parsed.data.rating === "" ? null : Number(parsed.data.rating),
        productId: parsed.data.productId === "" ? null : parsed.data.productId,
      },
      photo,
    );
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.reviews);
  return { ok: true, message: "Review added and published" };
}
