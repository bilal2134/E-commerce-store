"use server";

import { redirect } from "next/navigation";
import { fieldErrorsFrom } from "@/domain/validation/common";
import {
  manualOrderFromFormData,
  manualOrderSchema,
  statusChangeSchema,
  toManualOrderInput,
} from "@/domain/validation/order";
import { fail, type ActionResult } from "@/domain/validation/result";
import { changeOrderStatus, createManualOrder } from "@/server/admin/orders";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { refreshAfterWrite, toFailure } from "../../_lib/mutations";

export async function createManualOrderAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = manualOrderSchema.safeParse(manualOrderFromFormData(formData));
  if (!parsed.success)
    return fail("Fix the highlighted fields and save again.", fieldErrorsFrom(parsed.error));
  let id: string;
  try {
    id = (await createManualOrder(db(), admin.id, toManualOrderInput(parsed.data))).id;
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite();
  redirect(`/admin/orders/${id}?created=1`);
}

export async function changeOrderStatusAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = statusChangeSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) return fail("Choose a status.", fieldErrorsFrom(parsed.error));
  try {
    await changeOrderStatus(db(), admin.id, parsed.data.orderId, parsed.data.status, parsed.data.note);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite();
  return { ok: true, message: "Order status updated" };
}
