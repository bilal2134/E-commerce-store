import "server-only";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import type { StockStatus } from "@/domain/catalog";
import { clampQuantity, isLowStock, isTracked, orderLineUsesStock, statusForQuantity } from "@/domain/stock";
import type { Database } from "../db/client";
import { categories, productImages, products, productSizes } from "../db/schema";
import { AdminError } from "./errors";

/**
 * Stock quantities (src/domain/stock.ts). Every change locks the product row
 * first, so concurrent orders and admin edits serialise on PostgreSQL; on
 * Aurora DSQL the transaction retries on conflict instead.
 */

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function lockProduct(tx: Tx, productId: string) {
  const [product] = await tx
    .select({
      id: products.id,
      name: products.name,
      stockStatus: products.stockStatus,
      stockQuantity: products.stockQuantity,
    })
    .from(products)
    .where(eq(products.id, productId))
    .for("update");
  return product ?? null;
}

/**
 * Re-derives what follows from the counts: a sized product's total, each
 * size's availability and the product's status (preorder is left alone).
 * No-op for products that don't track stock.
 */
export async function syncProductStock(tx: Tx, productId: string): Promise<void> {
  const product = await lockProduct(tx, productId);
  if (!product || !isTracked(product.stockQuantity)) return;
  const sizes = await tx
    .select({
      label: productSizes.label,
      qty: productSizes.stockQuantity,
      isAvailable: productSizes.isAvailable,
    })
    .from(productSizes)
    .where(eq(productSizes.productId, productId));

  let total = product.stockQuantity;
  if (sizes.length > 0) {
    total = 0;
    for (const s of sizes) {
      const qty = s.qty ?? 0;
      total += qty;
      if (s.qty === null || s.isAvailable !== qty > 0) {
        await tx
          .update(productSizes)
          .set({ stockQuantity: qty, isAvailable: qty > 0 })
          .where(and(eq(productSizes.productId, productId), eq(productSizes.label, s.label)));
      }
    }
  }
  const status = statusForQuantity(product.stockStatus, total);
  if (total !== product.stockQuantity || status !== product.stockStatus) {
    await tx
      .update(products)
      .set({ stockQuantity: total, stockStatus: status })
      .where(eq(products.id, productId));
  }
}

/** +/- from the admin (or a typed count sent as the difference from what was shown). */
export async function adjustStock(
  database: Database,
  input: { productId: string; size: string | null; delta: number },
): Promise<{ quantity: number; status: StockStatus }> {
  return database.transaction(async (tx) => {
    const product = await lockProduct(tx, input.productId);
    if (!product) throw new AdminError("This product no longer exists.");
    if (!isTracked(product.stockQuantity)) {
      throw new AdminError("Turn on “Track stock” for this product first (Edit product).");
    }
    let quantity: number;
    if (input.size !== null) {
      const [size] = await tx
        .select({ qty: productSizes.stockQuantity })
        .from(productSizes)
        .where(and(eq(productSizes.productId, input.productId), eq(productSizes.label, input.size)))
        .limit(1);
      if (!size) throw new AdminError(`Size ${input.size} is no longer offered for this product.`);
      quantity = clampQuantity((size.qty ?? 0) + input.delta);
      await tx
        .update(productSizes)
        .set({ stockQuantity: quantity })
        .where(and(eq(productSizes.productId, input.productId), eq(productSizes.label, input.size)));
    } else {
      const [sized] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(productSizes)
        .where(eq(productSizes.productId, input.productId));
      if ((sized?.n ?? 0) > 0) throw new AdminError("Change the stock of a specific size.");
      quantity = clampQuantity(product.stockQuantity + input.delta);
      await tx.update(products).set({ stockQuantity: quantity }).where(eq(products.id, input.productId));
    }
    await syncProductStock(tx, input.productId);
    const [after] = await tx
      .select({ status: products.stockStatus })
      .from(products)
      .where(eq(products.id, input.productId));
    return { quantity, status: after?.status ?? product.stockStatus };
  });
}

export interface StockLine {
  productId: string | null;
  size: string | null;
  quantity: number;
}

/**
 * Takes stock for an order line. Returns whether stock was taken (false for
 * untracked or preorder products); throws when there isn't enough.
 */
export async function takeStock(tx: Tx, line: StockLine): Promise<boolean> {
  if (!line.productId) return false;
  const product = await lockProduct(tx, line.productId);
  if (!product || !orderLineUsesStock(product)) return false;
  if (line.size !== null) {
    const [size] = await tx
      .select({ qty: productSizes.stockQuantity })
      .from(productSizes)
      .where(and(eq(productSizes.productId, line.productId), eq(productSizes.label, line.size)))
      .limit(1);
    if (!size) return false;
    const have = size.qty ?? 0;
    if (have < line.quantity) {
      throw new AdminError(notEnough(product.name, have, line.size), { quantity: notEnoughField(have) });
    }
    await tx
      .update(productSizes)
      .set({ stockQuantity: have - line.quantity })
      .where(and(eq(productSizes.productId, line.productId), eq(productSizes.label, line.size)));
  } else {
    const have = product.stockQuantity ?? 0;
    if (have < line.quantity) {
      throw new AdminError(notEnough(product.name, have, null), { quantity: notEnoughField(have) });
    }
    await tx
      .update(products)
      .set({ stockQuantity: have - line.quantity })
      .where(eq(products.id, line.productId));
  }
  await syncProductStock(tx, line.productId);
  return true;
}

/** Gives an order line's stock back (order cancelled). Skips products that stopped tracking or sizes that were removed. */
export async function returnStock(tx: Tx, line: StockLine): Promise<void> {
  if (!line.productId) return;
  const product = await lockProduct(tx, line.productId);
  if (!product || !isTracked(product.stockQuantity)) return;
  if (line.size !== null) {
    const [size] = await tx
      .select({ qty: productSizes.stockQuantity })
      .from(productSizes)
      .where(and(eq(productSizes.productId, line.productId), eq(productSizes.label, line.size)))
      .limit(1);
    if (!size) return;
    await tx
      .update(productSizes)
      .set({ stockQuantity: clampQuantity((size.qty ?? 0) + line.quantity) })
      .where(and(eq(productSizes.productId, line.productId), eq(productSizes.label, line.size)));
  } else {
    await tx
      .update(products)
      .set({ stockQuantity: clampQuantity(product.stockQuantity + line.quantity) })
      .where(eq(products.id, line.productId));
  }
  await syncProductStock(tx, line.productId);
}

function notEnough(name: string, have: number, size: string | null): string {
  const where = size ? `${name} in size ${size}` : name;
  return have === 0
    ? `${where} is out of stock. Add stock under Stock first, or mark the order as cancelled.`
    : `Only ${have} left of ${where}. Add stock under Stock first, or lower the quantity.`;
}

function notEnoughField(have: number): string {
  return have === 0 ? "Out of stock" : `Only ${have} in stock`;
}

/* ------------------------------------------------------------------ */
/* Stock page                                                          */
/* ------------------------------------------------------------------ */

export interface StockRow {
  id: string;
  code: string;
  name: string;
  categoryName: string;
  isVisible: boolean;
  stockStatus: StockStatus;
  /** Null when the product doesn't track stock. */
  quantity: number | null;
  low: boolean;
  sizes: { label: string; quantity: number; low: boolean }[];
  thumb: { storageKey: string; widths: number[]; alt: string } | null;
}

export type StockFilter = "all" | "tracked" | "low" | "untracked";

export async function listStock(
  database: Database,
  filters: { q?: string; filter?: StockFilter },
): Promise<StockRow[]> {
  const q = filters.q?.trim();
  const like = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const rows = await database
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      categoryName: categories.name,
      isVisible: products.isVisible,
      stockStatus: products.stockStatus,
      quantity: products.stockQuantity,
      thumbKey: productImages.storageKey,
      thumbWidths: productImages.widths,
      thumbAlt: productImages.alt,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.position, 0)))
    .where(like ? or(ilike(products.name, like), ilike(products.code, like)) : undefined)
    .orderBy(asc(products.name));
  const sizes = await database
    .select({ productId: productSizes.productId, label: productSizes.label, qty: productSizes.stockQuantity })
    .from(productSizes)
    .orderBy(asc(productSizes.position), asc(productSizes.label));
  const byProduct = new Map<string, { label: string; quantity: number; low: boolean }[]>();
  for (const s of sizes) {
    if (s.qty === null) continue;
    const list = byProduct.get(s.productId) ?? [];
    list.push({ label: s.label, quantity: s.qty, low: isLowStock(s.qty) });
    byProduct.set(s.productId, list);
  }

  const all: StockRow[] = rows.map((r) => {
    const sizeRows = isTracked(r.quantity) ? (byProduct.get(r.id) ?? []) : [];
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      categoryName: r.categoryName,
      isVisible: r.isVisible,
      stockStatus: r.stockStatus,
      quantity: r.quantity,
      low: sizeRows.length > 0 ? sizeRows.some((s) => s.low) : isLowStock(r.quantity),
      sizes: sizeRows,
      thumb: r.thumbKey
        ? { storageKey: r.thumbKey, widths: r.thumbWidths ?? [], alt: r.thumbAlt ?? "" }
        : null,
    };
  });
  switch (filters.filter) {
    case "tracked":
      return all.filter((r) => r.quantity !== null);
    case "low":
      return all.filter((r) => r.quantity !== null && r.low && r.stockStatus !== "preorder");
    case "untracked":
      return all.filter((r) => r.quantity === null);
    default:
      return all;
  }
}

/** Dashboard: tracked products with a size or the product at or below the low-stock threshold. */
export async function countLowStock(database: Database): Promise<number> {
  return (await listStock(database, { filter: "low" })).length;
}
