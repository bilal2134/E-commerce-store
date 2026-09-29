import type { Catalog } from "@/domain/category";
import type { ProductCard } from "@/domain/product";

let n = 0;

export function card(over: Partial<ProductCard> = {}): ProductCard {
  n++;
  return {
    id: `id-${n}`,
    code: `USBA-${String(n).padStart(3, "0")}`,
    slug: `product-${n}`,
    name: `Product ${n}`,
    categorySlug: "heels",
    categoryName: "Heels",
    rootCategorySlug: "footwear",
    pricePkr: 2000,
    salePricePkr: null,
    stockStatus: "in_stock",
    badge: null,
    collabPartner: null,
    colors: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    featuredRank: null,
    image: null,
    hoverImage: null,
    ...over,
  };
}

export function sampleCatalog(products: ProductCard[]): Catalog {
  const node = (id: string, slug: string, name: string, parentId: string | null, position: number) => ({
    id,
    slug,
    name,
    description: `${name} desc`,
    parentId,
    position,
  });
  return {
    categories: [
      {
        ...node("c1", "footwear", "Footwear", null, 0),
        children: [node("c1a", "heels", "Heels", "c1", 0), node("c1b", "sneakers", "Sneakers", "c1", 1)],
      },
      {
        ...node("c2", "bags", "Bags", null, 1),
        children: [node("c2a", "wallets", "Wallets", "c2", 0)],
      },
    ],
    products,
  };
}
