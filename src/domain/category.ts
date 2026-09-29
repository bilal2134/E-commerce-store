import { COLLECTIONS, isCollectionSlug, type CollectionSlug } from "./catalog";
import { isOnSale } from "./money";
import type { ProductCard } from "./product";

export interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  description: string;
  parentId: string | null;
  position: number;
}

export interface CategoryTree extends CategoryNode {
  children: CategoryNode[];
}

export interface Catalog {
  categories: CategoryTree[];
  products: ProductCard[];
}

export interface Crumb {
  name: string;
  href: string;
}

export interface ShopListing {
  kind: "all" | "category" | "subcategory" | "collection";
  slug: string | null;
  title: string;
  description: string;
  /** Sub-categories offered as quick filters (top-level categories only). */
  subcategories: { slug: string; name: string }[];
  breadcrumbs: Crumb[];
  products: ProductCard[];
}

export function findCategory(
  tree: readonly CategoryTree[],
  slug: string,
): { node: CategoryNode; parent: CategoryTree | null; children: CategoryNode[] } | null {
  for (const root of tree) {
    if (root.slug === slug) return { node: root, parent: null, children: root.children };
    const child = root.children.find((c) => c.slug === slug);
    if (child) return { node: child, parent: root, children: [] };
  }
  return null;
}

export function collectionProducts(products: readonly ProductCard[], slug: CollectionSlug): ProductCard[] {
  switch (slug) {
    case "collab":
      return products.filter((p) => p.collabPartner !== null);
    case "sale":
      return products.filter((p) => isOnSale(p.pricePkr, p.salePricePkr));
  }
}

const SHOP_CRUMB: Crumb = { name: "Shop", href: "/shop" };
const HOME_CRUMB: Crumb = { name: "Home", href: "/" };

/** Resolve /shop and /shop/<slug> to a listing, or null for unknown slugs. */
export function resolveShopListing(catalog: Catalog, slug: string | null): ShopListing | null {
  if (slug === null) {
    return {
      kind: "all",
      slug: null,
      title: "Shop all",
      description: "Every USBA piece — heels, sneakers, bags, wallets, jewellery, phone cases and clothing.",
      subcategories: catalog.categories.map((c) => ({ slug: c.slug, name: c.name })),
      breadcrumbs: [HOME_CRUMB, SHOP_CRUMB],
      products: catalog.products,
    };
  }

  if (isCollectionSlug(slug)) {
    const c = COLLECTIONS[slug];
    return {
      kind: "collection",
      slug,
      title: c.title,
      description: c.description,
      subcategories: [],
      breadcrumbs: [HOME_CRUMB, SHOP_CRUMB, { name: c.title, href: `/shop/${slug}` }],
      products: collectionProducts(catalog.products, slug),
    };
  }

  const found = findCategory(catalog.categories, slug);
  if (!found) return null;
  const { node, parent, children } = found;
  const slugs = new Set([node.slug, ...children.map((c) => c.slug)]);
  const crumbs: Crumb[] = [HOME_CRUMB, SHOP_CRUMB];
  if (parent) crumbs.push({ name: parent.name, href: `/shop/${parent.slug}` });
  crumbs.push({ name: node.name, href: `/shop/${node.slug}` });
  return {
    kind: parent ? "subcategory" : "category",
    slug: node.slug,
    title: node.name,
    description: node.description,
    subcategories: children.map((c) => ({ slug: c.slug, name: c.name })),
    breadcrumbs: crumbs,
    products: catalog.products.filter((p) => slugs.has(p.categorySlug)),
  };
}

/** Every /shop/<slug> path that should exist (for sitemap + static params). */
export function allShopSlugs(tree: readonly CategoryTree[]): string[] {
  return [
    ...tree.flatMap((root) => [root.slug, ...root.children.map((c) => c.slug)]),
    ...Object.keys(COLLECTIONS),
  ];
}
