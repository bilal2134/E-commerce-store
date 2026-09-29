"use server";

import { z } from "zod";
import { fieldErrorsFrom } from "@/domain/validation/common";
import { instagramPostFromFormData, instagramPostSchema } from "@/domain/validation/instagram";
import { fail, type ActionResult } from "@/domain/validation/result";
import { createInstagramPost, deleteInstagramPost, moveInstagramPost } from "@/server/admin/instagram";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { storage } from "@/server/storage";
import { readUpload, refreshAfterWrite, TAGS, toFailure } from "../../_lib/mutations";

export async function createInstagramPostAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = instagramPostSchema.safeParse(instagramPostFromFormData(formData));
  if (!parsed.success)
    return fail("Fix the highlighted fields and save again.", fieldErrorsFrom(parsed.error));
  try {
    await createInstagramPost(db(), storage(), parsed.data, await readUpload(formData, "image"));
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.settings);
  return { ok: true, message: "Post added to the homepage" };
}

export async function deleteInstagramPostAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail("Invalid request.");
  try {
    await deleteInstagramPost(db(), storage(), id);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.settings);
  return { ok: true, message: "Post removed" };
}

export async function moveInstagramPostAction(id: string, direction: string): Promise<ActionResult> {
  await requireAdmin();
  const dir = z.enum(["up", "down"]).safeParse(direction);
  if (!z.uuid().safeParse(id).success || !dir.success) return fail("Invalid request.");
  try {
    await moveInstagramPost(db(), id, dir.data);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.settings);
  return { ok: true, message: "Order saved" };
}
