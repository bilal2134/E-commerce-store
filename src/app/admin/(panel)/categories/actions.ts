"use server";

import { z } from "zod";
import { categoryDetailsSchema, categoryFromFormData, newCategorySchema } from "@/domain/validation/category";
import { fieldErrorsFrom } from "@/domain/validation/common";
import { fail, type ActionResult } from "@/domain/validation/result";
import {
  createSubcategory,
  deleteCategory,
  moveCategory,
  updateCategoryDetails,
} from "@/server/admin/categories";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { refreshAfterWrite, TAGS, toFailure } from "../../_lib/mutations";

export async function updateCategoryAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return fail("Invalid request.");
  const parsed = categoryDetailsSchema.safeParse(categoryFromFormData(formData));
  if (!parsed.success)
    return fail("Fix the highlighted fields and save again.", fieldErrorsFrom(parsed.error));
  try {
    await updateCategoryDetails(db(), id, parsed.data);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.catalog);
  return { ok: true, message: "Category saved" };
}

export async function createCategoryAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = newCategorySchema.safeParse(categoryFromFormData(formData));
  if (!parsed.success)
    return fail("Fix the highlighted fields and save again.", fieldErrorsFrom(parsed.error));
  try {
    await createSubcategory(db(), parsed.data);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.catalog);
  return { ok: true, message: `Added “${parsed.data.name}”.` };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail("Invalid request.");
  try {
    await deleteCategory(db(), id);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.catalog);
  return { ok: true, message: "Category deleted" };
}

export async function moveCategoryAction(id: string, direction: string): Promise<ActionResult> {
  await requireAdmin();
  const dir = z.enum(["up", "down"]).safeParse(direction);
  if (!z.uuid().safeParse(id).success || !dir.success) return fail("Invalid request.");
  try {
    await moveCategory(db(), id, dir.data);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.catalog);
  return { ok: true, message: "Order saved" };
}
