"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { STOCK_STATUSES } from "@/domain/catalog";
import { fieldErrorsFrom } from "@/domain/validation/common";
import {
  productFormSchema,
  productValuesFromFormData,
  toProductInput,
  DEFAULT_COLLAB_HANDLE,
} from "@/domain/validation/product";
import { fail, type ActionResult } from "@/domain/validation/result";
import * as admin from "@/server/admin/products";
import { getSettingsRow } from "@/server/admin/settings";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { processAndStoreImage } from "@/server/images/pipeline";
import { mediaBaseUrl, storage } from "@/server/storage";
import { readUpload, refreshAfterWrite, TAGS, toFailure } from "../../_lib/mutations";

const idSchema = z.uuid();

export async function saveProductAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = productFormSchema.safeParse(productValuesFromFormData(formData));
  if (!parsed.success) {
    return fail("Fix the highlighted fields and save again.", fieldErrorsFrom(parsed.error));
  }
  const rawId = formData.get("productId");
  const productId = typeof rawId === "string" && rawId !== "" ? rawId : null;
  if (productId !== null && !idSchema.safeParse(productId).success) return fail("Invalid product.");

  let createdId: string | null = null;
  try {
    const settings = await getSettingsRow(db());
    const input = toProductInput(parsed.data, settings.collabInstagramHandle || DEFAULT_COLLAB_HANDLE);
    if (productId) {
      await admin.updateProduct(db(), storage(), productId, input);
    } else {
      createdId = (await admin.createProduct(db(), input)).id;
    }
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.catalog);
  if (createdId) redirect(`/admin/products/${createdId}?saved=created`);
  return { ok: true, message: "Product saved" };
}

export interface UploadedImage {
  storageKey: string;
  widths: number[];
  width: number;
  height: number;
  blurDataUrl: string;
  previewUrl: string;
}

export type UploadResult = { ok: true; image: UploadedImage } | { ok: false; error: string };

/** One image per call so the client can show per-file progress and errors. */
export async function uploadProductImageAction(formData: FormData): Promise<UploadResult> {
  await requireAdmin();
  const bytes = await readUpload(formData, "file");
  if (!bytes) return { ok: false, error: "Choose an image file." };
  try {
    const img = await processAndStoreImage(storage(), bytes, "products");
    const smallest = Math.min(...img.widths);
    return {
      ok: true,
      image: { ...img, previewUrl: `${mediaBaseUrl(img.storageKey)}-${smallest}.webp` },
    };
  } catch (err) {
    const r = toFailure(err);
    return { ok: false, error: !r.ok && r.formError ? r.formError : "Upload failed." };
  }
}

const discardSchema = z.object({
  storageKey: z.string().regex(/^products\/[0-9a-f-]{36}$/),
  widths: z.array(z.number().int().positive()).min(1).max(6),
});

/** Remove an uploaded image the admin dropped before saving (no-op if it is in use). */
export async function discardProductImageAction(input: {
  storageKey: string;
  widths: number[];
}): Promise<void> {
  await requireAdmin();
  const parsed = discardSchema.safeParse(input);
  if (!parsed.success) return;
  await admin.discardUnreferencedImage(db(), storage(), parsed.data);
}

export async function setProductVisibilityAction(id: string, visible: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success || typeof visible !== "boolean") return fail("Invalid request.");
  try {
    await admin.setProductVisibility(db(), id, visible);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.catalog);
  return { ok: true, message: visible ? "Product is now visible on the site" : "Product is now hidden" };
}

export async function setProductStockAction(id: string, stock: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z.enum(STOCK_STATUSES).safeParse(stock);
  if (!idSchema.safeParse(id).success || !parsed.success) return fail("Invalid request.");
  try {
    await admin.setProductStock(db(), id, parsed.data);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.catalog);
  return { ok: true, message: "Stock status updated" };
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return fail("Invalid request.");
  try {
    await admin.deleteProduct(db(), storage(), id);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.catalog, TAGS.reviews);
  return { ok: true, message: "Product deleted" };
}

export async function setFeaturedOrderAction(ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z.array(z.uuid()).max(500).safeParse(ids);
  if (!parsed.success) return fail("Invalid request.");
  try {
    await admin.setFeaturedOrder(db(), parsed.data);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.catalog);
  return { ok: true, message: "Homepage order saved" };
}

export async function addFeaturedAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return fail("Choose a product to feature.");
  try {
    await admin.addFeatured(db(), id);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.catalog);
  return { ok: true, message: "Added to homepage" };
}

export async function removeFeaturedAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return fail("Invalid request.");
  try {
    await admin.removeFeatured(db(), id);
  } catch (err) {
    return toFailure(err);
  }
  refreshAfterWrite(TAGS.catalog);
  return { ok: true, message: "Removed from homepage" };
}
