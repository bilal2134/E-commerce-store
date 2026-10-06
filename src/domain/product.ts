import type { Badge, Color, StockStatus } from "./catalog";
import type { ResponsiveImage } from "./images";

/** Data needed to render a product card / listing entry. Serializable. */
export interface ProductCard {
  id: string;
  code: string;
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  rootCategorySlug: string;
  pricePkr: number;
  salePricePkr: number | null;
  stockStatus: StockStatus;
  badge: Badge | null;
  collabPartner: string | null;
  colors: Color[];
  /** ISO timestamp. */
  createdAt: string;
  featuredRank: number | null;
  image: ResponsiveImage | null;
  hoverImage: ResponsiveImage | null;
}

export interface ProductSize {
  label: string;
  isAvailable: boolean;
  /** "Only N left" count for this size, or null (see visibleRemaining). */
  remaining: number | null;
}

export interface ProductDetail extends ProductCard {
  description: string;
  images: ResponsiveImage[];
  sizes: ProductSize[];
  rootCategoryName: string;
  /** "Only N left" count for the product, or null when not low or not counted. */
  remaining: number | null;
  /** ISO timestamp. */
  updatedAt: string;
}

export function requiresSize(product: Pick<ProductDetail, "sizes">): boolean {
  return product.sizes.length > 0;
}

/** Descriptive alt text fallback when an admin left alt text empty. */
export function defaultImageAlt(productName: string, index: number, total: number): string {
  return total > 1 ? `${productName} — photo ${index + 1} of ${total}` : productName;
}

/**
 * Badge to display: the admin's choice, or "Collab" for collab items without
 * one, so collab products are always marked (Flow C-4 step 3).
 */
export function displayBadge(product: Pick<ProductCard, "badge" | "collabPartner">): Badge | null {
  return product.badge ?? (product.collabPartner ? "collab" : null);
}
