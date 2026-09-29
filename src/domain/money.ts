/**
 * Money handling. Prices are whole Pakistani rupees stored as integers
 * (never floats). If a payment gateway later needs minor units (paisa),
 * convert at that boundary: `rupees * 100`.
 */

export type Pkr = number & { readonly __brand?: "PKR" };

export function isValidPkr(value: unknown): value is Pkr {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

const formatter = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });

/** "Rs. 2,499" — the format used across Requirements (e.g. "Rs. 1499"). */
export function formatPkr(amount: number): string {
  return `Rs. ${formatter.format(amount)}`;
}

export interface PriceInfo {
  /** Price the customer pays now. */
  current: number;
  /** Original price when on sale, otherwise null. */
  original: number | null;
  /** Whole-number discount percentage when on sale. */
  discountPercent: number | null;
}

/**
 * A product is on sale only when a sale price exists and is strictly lower
 * than the original price (the DB enforces this too).
 */
export function priceInfo(pricePkr: number, salePricePkr: number | null): PriceInfo {
  if (salePricePkr !== null && salePricePkr > 0 && salePricePkr < pricePkr) {
    return {
      current: salePricePkr,
      original: pricePkr,
      discountPercent: Math.round(((pricePkr - salePricePkr) / pricePkr) * 100),
    };
  }
  return { current: pricePkr, original: null, discountPercent: null };
}

export function isOnSale(pricePkr: number, salePricePkr: number | null): boolean {
  return priceInfo(pricePkr, salePricePkr).original !== null;
}
