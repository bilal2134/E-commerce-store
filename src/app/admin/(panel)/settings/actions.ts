"use server";

import { fieldErrorsFrom } from "@/domain/validation/common";
import { fail, type ActionResult } from "@/domain/validation/result";
import { settingsSchema, settingsValuesFromFormData } from "@/domain/validation/settings";
import { updateSettings } from "@/server/admin/settings";
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
