/**
 * Catalog vocabulary shared by server, client, database and validation.
 * Single source of truth for every enumerated status in the store.
 */

export const STOCK_STATUSES = ["in_stock", "out_of_stock", "preorder"] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  preorder: "Preorder",
};

/**
 * Badge values from Requirements §11.2 (New Arrival / Bestseller / Trending /
 * Collab / Sale) plus the two promotional badges that appear in the §11.1
 * category table ("Viral", "Buy 2 Get 1"). See docs/ASSUMPTIONS.md A-07.
 */
export const BADGES = [
  "new_arrival",
  "bestseller",
  "trending",
  "collab",
  "sale",
  "viral",
  "buy_2_get_1",
] as const;
export type Badge = (typeof BADGES)[number];

export const BADGE_LABELS: Record<Badge, string> = {
  new_arrival: "New Arrival",
  bestseller: "Bestseller",
  trending: "Trending",
  collab: "Collab",
  sale: "Sale",
  viral: "Viral",
  buy_2_get_1: "Buy 2 Get 1",
};

/** Colour facets for the colour filter (CS-03). Stored as these keys. */
export const COLORS = [
  "black",
  "white",
  "cream",
  "brown",
  "red",
  "pink",
  "purple",
  "blue",
  "green",
  "yellow",
  "gold",
  "silver",
  "multicolor",
] as const;
export type Color = (typeof COLORS)[number];

export const COLOR_LABELS: Record<Color, string> = {
  black: "Black",
  white: "White",
  cream: "Cream",
  brown: "Brown",
  red: "Red",
  pink: "Pink",
  purple: "Purple",
  blue: "Blue",
  green: "Green",
  yellow: "Yellow",
  gold: "Gold",
  silver: "Silver",
  multicolor: "Multicolour",
};

/** Swatch colours used purely for display in filters. */
export const COLOR_SWATCHES: Record<Color, string> = {
  black: "#1b1718",
  white: "#ffffff",
  cream: "#efe4cf",
  brown: "#7a4f35",
  red: "#b3202c",
  pink: "#eda3bd",
  purple: "#7d4f9e",
  blue: "#3f63b5",
  green: "#3f7d58",
  yellow: "#e8c547",
  gold: "#c9a24a",
  silver: "#b9bcc2",
  multicolor: "conic-gradient(#b3202c, #e8c547, #3f7d58, #3f63b5, #7d4f9e, #b3202c)",
};

/** Requirements §11.2: size options are for footwear only (36–41). */
export const FOOTWEAR_SIZES = ["36", "37", "38", "39", "40", "41"] as const;

export const MIN_PRODUCT_IMAGES = 2;
export const MAX_PRODUCT_IMAGES = 6;

/** Top-level category slug whose products carry size options. */
export const SIZED_ROOT_CATEGORY = "footwear";

/**
 * Virtual collections served under /shop/<slug>. These slugs are reserved and
 * may not be used by categories.
 */
export const COLLECTIONS = {
  collab: {
    slug: "collab",
    title: "Fairycoreforher Collab",
    description:
      "Pieces from the USBA × @fairycoreforher collaboration — shoes, bags and clothing tagged as collab items.",
  },
  sale: {
    slug: "sale",
    title: "Sale",
    description: "Special prices on selected USBA pieces. Original prices shown crossed out.",
  },
} as const;
export type CollectionSlug = keyof typeof COLLECTIONS;
export const RESERVED_SHOP_SLUGS: readonly string[] = Object.keys(COLLECTIONS);

export function isCollectionSlug(slug: string): slug is CollectionSlug {
  return slug in COLLECTIONS;
}
