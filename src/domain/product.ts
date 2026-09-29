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
}

export interface ProductDetail extends ProductCard {
  description: string;
  images: ResponsiveImage[];
  sizes: ProductSize[];
  rootCategoryName: string;
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
