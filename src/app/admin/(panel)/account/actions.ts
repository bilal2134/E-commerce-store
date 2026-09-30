"use server";

import { changePasswordFromFormData, changePasswordSchema } from "@/domain/validation/account";
import { fieldErrorsFrom } from "@/domain/validation/common";
import { fail, type ActionResult } from "@/domain/validation/result";
import { changeAdminPassword } from "@/server/admin/account";
import { currentSessionId, requireAdmin, revokeOtherSessions } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { toFailure } from "../../_lib/mutations";

export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = changePasswordSchema.safeParse(changePasswordFromFormData(formData));
  if (!parsed.success)
    return fail("Fix the highlighted fields and try again.", fieldErrorsFrom(parsed.error));
  try {
    const { revoked } = await changeAdminPassword(db(), {
      adminId: admin.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
      keepSessionId: await currentSessionId(),
    });
    return {
      ok: true,
      message: revoked
        ? `Password changed. Signed out ${revoked} other ${revoked === 1 ? "session" : "sessions"}.`
        : "Password changed.",
    };
  } catch (err) {
    return toFailure(err);
  }
}

export async function signOutOtherSessionsAction(): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    const revoked = await revokeOtherSessions(db(), admin.id, await currentSessionId());
    return {
      ok: true,
      message: revoked
        ? `Signed out ${revoked} other ${revoked === 1 ? "session" : "sessions"}.`
        : "No other sessions were signed in.",
    };
  } catch (err) {
    return toFailure(err);
  }
}
