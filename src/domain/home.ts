import { collectionProducts, findCategory, type Catalog } from "./category";
import { sortProducts } from "./listing";
import type { ProductCard } from "./product";

/** Category shortcuts shown on the homepage, in site-map order (§11.3). */
const SHORTCUT_SLUGS = [
  ["heels", "Heels"],
  ["sneakers", "Sneakers"],
  ["flats", "Flats & sandals"],
  ["bags", "Bags"],
  ["wallets", "Wallets"],
  ["jewellery", "Jewellery"],
  ["phone-cases", "Phone cases"],
  ["clothing", "Clothing"],
] as const;

export interface CategoryShortcut {
  slug: string;
  label: string;
  count: number;
  cover: ProductCard | null;
}

export interface HomeSections {
  featured: ProductCard[];
  newArrivals: ProductCard[];
  trending: ProductCard[];
  collab: ProductCard[];
  sale: ProductCard[];
  shortcuts: CategoryShortcut[];
}

const inStockFirst = (list: ProductCard[]) =>
  [...list].sort(
    (a, b) => Number(a.stockStatus === "out_of_stock") - Number(b.stockStatus === "out_of_stock"),
  );

export function buildHomeSections(catalog: Catalog): HomeSections {
  const all = catalog.products;
  const available = all.filter((p) => p.stockStatus !== "out_of_stock");

  // Featured = admin-picked (AS-18); falls back to newest when none are picked.
  const picked = all.filter((p) => p.featuredRank !== null);
  const featured = (
    picked.length ? sortProducts(picked, "featured") : sortProducts(available, "newest")
  ).slice(0, 8);

  const newArrivals = sortProducts(available, "newest").slice(0, 10);
  const trending = sortProducts(
    available.filter((p) => p.badge === "trending" || p.badge === "bestseller" || p.badge === "viral"),
    "featured",
  ).slice(0, 4);
  const collab = inStockFirst(collectionProducts(all, "collab")).slice(0, 6);
  const sale = sortProducts(collectionProducts(available, "sale"), "featured").slice(0, 10);

  const shortcuts: CategoryShortcut[] = [];
  for (const [slug, label] of SHORTCUT_SLUGS) {
    const found = findCategory(catalog.categories, slug);
    if (!found) continue;
    const slugs = new Set([found.node.slug, ...found.children.map((c) => c.slug)]);
    const inCategory = sortProducts(
      all.filter((p) => slugs.has(p.categorySlug)),
      "featured",
    );
    shortcuts.push({ slug, label, count: inCategory.length, cover: inCategory[0] ?? null });
  }

  return { featured, newArrivals, trending, collab, sale, shortcuts };
}
