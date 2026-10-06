"use server";

import { z } from "zod";
import type { StockStatus } from "@/domain/catalog";
import { FOOTWEAR_SIZES } from "@/domain/catalog";
import { MAX_STOCK_QUANTITY } from "@/domain/stock";
import { adjustStock } from "@/server/admin/stock";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { refreshAfterWrite, TAGS, toFailure } from "../../_lib/mutations";

const adjustSchema = z.object({
  productId: z.uuid(),
  size: z.enum(FOOTWEAR_SIZES).nullable(),
  delta: z
    .number()
    .int()
    .min(-MAX_STOCK_QUANTITY)
    .max(MAX_STOCK_QUANTITY)
    .refine((d) => d !== 0),
});

export type AdjustStockResult =
  { ok: true; quantity: number; status: StockStatus } | { ok: false; error: string };

/** −/+ and typed counts on the Stock page; a typed count arrives as the difference from what was shown. */
export async function adjustStockAction(input: {
  productId: string;
  size: string | null;
  delta: number;
}): Promise<AdjustStockResult> {
  await requireAdmin();
  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  try {
    const result = await adjustStock(db(), parsed.data);
    refreshAfterWrite(TAGS.catalog);
    return { ok: true, ...result };
  } catch (err) {
    const failure = toFailure(err);
    return { ok: false, error: (!failure.ok && failure.formError) || "Could not update stock." };
  }
}
