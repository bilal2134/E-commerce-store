import type { StockStatus } from "./catalog";
import type { OrderStatus } from "./orders";

/**
 * Stock quantities (owner request 2026-10-06). Tracking is optional per
 * product: `stockQuantity === null` keeps the manual status from before.
 * When tracked, footwear counts per size and the product total is their sum;
 * other products have one count. The status customers see follows the count
 * (in stock / out of stock) unless the owner chose preorder.
 */

/** "Only N left" appears from this count down; above it customers just see "In stock". */
export const LOW_STOCK_THRESHOLD = 5;
export const MAX_STOCK_QUANTITY = 99_999;

export function isTracked(quantity: number | null | undefined): quantity is number {
  return typeof quantity === "number";
}

/** Status to store for a tracked product: preorder is the owner's choice, the rest follows the count. */
export function statusForQuantity(chosen: StockStatus, quantity: number | null): StockStatus {
  if (!isTracked(quantity) || chosen === "preorder") return chosen;
  return quantity > 0 ? "in_stock" : "out_of_stock";
}

/**
 * The count customers may see: only when it is low, so the exact inventory
 * isn't published. Null means "don't show a number".
 */
export function visibleRemaining(quantity: number | null, status: StockStatus): number | null {
  if (!isTracked(quantity) || status !== "in_stock") return null;
  return quantity >= 1 && quantity <= LOW_STOCK_THRESHOLD ? quantity : null;
}

export function isLowStock(quantity: number | null): boolean {
  return isTracked(quantity) && quantity <= LOW_STOCK_THRESHOLD;
}

/**
 * Applies a form edit made against `base` (the count the admin saw) to the
 * current count, so orders logged in the meantime aren't overwritten:
 * saw 5, typed 8, an order took 1 since → 7.
 */
export function rebaseQuantity(current: number, base: number, next: number): number {
  return clampQuantity(current + (next - base));
}

export function clampQuantity(n: number): number {
  return Math.min(MAX_STOCK_QUANTITY, Math.max(0, Math.trunc(n)));
}

/** Orders hold stock from the moment they're logged until they're cancelled. */
export function orderHoldsStock(status: OrderStatus): boolean {
  return status !== "cancelled";
}

/**
 * Whether an order line takes stock. Preorders are made to order, so they
 * never consume (or wait for) stock.
 */
export function orderLineUsesStock(product: {
  stockStatus: StockStatus;
  stockQuantity: number | null;
}): boolean {
  return isTracked(product.stockQuantity) && product.stockStatus !== "preorder";
}

/** A quantity typed by the admin: whole number 0..MAX, else null. */
export function parseQuantity(input: string): number | null {
  const s = input.trim();
  if (!/^\d{1,5}$/.test(s)) return null;
  const n = Number(s);
  return n <= MAX_STOCK_QUANTITY ? n : null;
}
