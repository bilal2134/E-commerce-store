"use server";

import { fieldErrorsFrom } from "@/domain/validation/common";
import {
  localizedSettingsFromFormData,
  localizedSettingsSchema,
} from "@/domain/validation/localized-settings";
import { fail, type ActionResult } from "@/domain/validation/result";
import { settingsSchema, settingsValuesFromFormData } from "@/domain/validation/settings";
import { getSettingsRow, updateSettings, updateUrduSettings } from "@/server/admin/settings";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { storage } from "@/server/storage";
import { readUpload, refreshAfterWrite, TAGS, toFailure } from "../../_lib/mutations";

export async function saveSettingsAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(settingsValuesFromFormData(formData));
  if (!parsed.success) {
    return fail("Fix the highlighted fields and save again.", fieldErrorsFrom(parsed.error));
  }
  try {
    const hero = await readUpload(formData, "heroImage");
    await updateSettings(db(), storage(), parsed.data, hero);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.settings);
  return { ok: true, message: "Settings saved" };
}

/** Urdu versions of the owner-entered text (CS-15). */
export async function saveUrduSettingsAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    const row = await getSettingsRow(db());
    const parsed = localizedSettingsSchema.safeParse(localizedSettingsFromFormData(formData, row.faq.length));
    if (!parsed.success)
      return fail("Fix the highlighted fields and save again.", fieldErrorsFrom(parsed.error));
    await updateUrduSettings(db(), parsed.data, row.faq);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.settings);
  return { ok: true, message: "Urdu text saved" };
}
