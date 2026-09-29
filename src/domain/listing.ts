import { COLORS, type Color } from "./catalog";
import { priceInfo } from "./money";
import type { ProductCard } from "./product";

/**
 * Listing filters and sorting (CS-02, CS-03, CS-04).
 *
 * Filter state lives in the URL query string so results are shareable,
 * bookmarkable and work with back/forward. Filtering itself is a pure
 * function over the category's product list; at the current catalogue size
 * (tens of products per listing) this runs in the browser for instant
 * feedback, and the same function can run server-side when listings grow
 * (see docs/architecture/scaling.md).
 */

export const SORT_OPTIONS = ["featured", "newest", "price_asc", "price_desc"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  featured: "Featured",
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

/** Preset price bands matching Requirements CS-04 (Rs. 1,499 – Rs. 2,500+). */
export const PRICE_BANDS = [
  { id: "under-1500", label: "Under Rs. 1,500", min: null, max: 1499 },
  { id: "1500-2000", label: "Rs. 1,500 – 2,000", min: 1500, max: 2000 },
  { id: "2000-2500", label: "Rs. 2,000 – 2,500", min: 2000, max: 2500 },
  { id: "2500-plus", label: "Rs. 2,500+", min: 2500, max: null },
] as const;

export interface ListingFilters {
  colors: Color[];
  minPrice: number | null;
  maxPrice: number | null;
  /** Restrict to a sub-category slug (used on top-level category pages). */
  sub: string | null;
  inStockOnly: boolean;
  sort: SortOption;
}

export const DEFAULT_FILTERS: ListingFilters = {
  colors: [],
  minPrice: null,
  maxPrice: null,
  sub: null,
  inStockOnly: false,
  sort: "featured",
};

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function getParam(source: ParamSource, key: string): string | undefined {
  if (source instanceof URLSearchParams) return source.get(key) ?? undefined;
  const v = source[key];
  return Array.isArray(v) ? v[0] : v;
}

function parsePrice(value: string | undefined): number | null {
  if (!value) return null;
  if (!/^\d{1,7}$/.test(value)) return null;
  const n = Number(value);
  return n >= 0 ? n : null;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseFilters(source: ParamSource): ListingFilters {
  const colorParam = getParam(source, "color") ?? "";
  const colors = [
    ...new Set(
      colorParam
        .split(",")
        .map((c) => c.trim().toLowerCase())
        .filter((c): c is Color => (COLORS as readonly string[]).includes(c)),
    ),
  ];
  let minPrice = parsePrice(getParam(source, "min"));
  let maxPrice = parsePrice(getParam(source, "max"));
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  const sortParam = getParam(source, "sort");
  const sort = (SORT_OPTIONS as readonly string[]).includes(sortParam ?? "")
    ? (sortParam as SortOption)
    : "featured";
  const sub = getParam(source, "sub");
  return {
    colors,
    minPrice,
    maxPrice,
    sub: sub && SLUG_RE.test(sub) ? sub : null,
    inStockOnly: getParam(source, "stock") === "in",
    sort,
  };
}

/** Canonical, stable query string (keys in fixed order, defaults omitted). */
export function serializeFilters(filters: ListingFilters): string {
  const params = new URLSearchParams();
  if (filters.sub) params.set("sub", filters.sub);
  if (filters.colors.length) params.set("color", [...filters.colors].sort().join(","));
  if (filters.minPrice !== null) params.set("min", String(filters.minPrice));
  if (filters.maxPrice !== null) params.set("max", String(filters.maxPrice));
  if (filters.inStockOnly) params.set("stock", "in");
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  return params.toString();
}

export function activeFilterCount(filters: ListingFilters): number {
  return (
    filters.colors.length +
    (filters.minPrice !== null || filters.maxPrice !== null ? 1 : 0) +
    (filters.sub ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0)
  );
}

export function matchesFilters(product: ProductCard, filters: ListingFilters): boolean {
  if (filters.sub && product.categorySlug !== filters.sub) return false;
  if (filters.inStockOnly && product.stockStatus === "out_of_stock") return false;
  if (filters.colors.length && !filters.colors.some((c) => product.colors.includes(c))) {
    return false;
  }
  const { current } = priceInfo(product.pricePkr, product.salePricePkr);
  if (filters.minPrice !== null && current < filters.minPrice) return false;
  if (filters.maxPrice !== null && current > filters.maxPrice) return false;
  return true;
}

function compareNewest(a: ProductCard, b: ProductCard): number {
  return b.createdAt.localeCompare(a.createdAt) || a.code.localeCompare(b.code);
}

function compareFeatured(a: ProductCard, b: ProductCard): number {
  // Out-of-stock items sink to the bottom of the default ordering.
  const oos = Number(a.stockStatus === "out_of_stock") - Number(b.stockStatus === "out_of_stock");
  if (oos !== 0) return oos;
  const ra = a.featuredRank ?? Number.POSITIVE_INFINITY;
  const rb = b.featuredRank ?? Number.POSITIVE_INFINITY;
  if (ra !== rb) return ra - rb;
  return compareNewest(a, b);
}

export function sortProducts(products: readonly ProductCard[], sort: SortOption): ProductCard[] {
  const current = (p: ProductCard) => priceInfo(p.pricePkr, p.salePricePkr).current;
  const copy = [...products];
  switch (sort) {
    case "newest":
      return copy.sort(compareNewest);
    case "price_asc":
      return copy.sort((a, b) => current(a) - current(b) || compareNewest(a, b));
    case "price_desc":
      return copy.sort((a, b) => current(b) - current(a) || compareNewest(a, b));
    case "featured":
      return copy.sort(compareFeatured);
  }
}

export function applyFilters(products: readonly ProductCard[], filters: ListingFilters): ProductCard[] {
  return sortProducts(
    products.filter((p) => matchesFilters(p, filters)),
    filters.sort,
  );
}

/** Colours present in a listing, with counts, for the colour facet. */
export function colorFacets(products: readonly ProductCard[]): { color: Color; count: number }[] {
  const counts = new Map<Color, number>();
  for (const p of products) for (const c of p.colors) counts.set(c, (counts.get(c) ?? 0) + 1);
  return COLORS.filter((c) => counts.has(c)).map((c) => ({ color: c, count: counts.get(c) ?? 0 }));
}
