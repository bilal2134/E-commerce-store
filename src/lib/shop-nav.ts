import type { Route } from "next";
import { findCategory, type CategoryTree, type ShopListing } from "@/domain/category";

/** Chips under a listing title: real links so every category is crawlable. */
export function listingNavLinks(
  tree: readonly CategoryTree[],
  listing: ShopListing,
): { href: Route; label: string; current?: boolean }[] {
  const roots = tree.map((r) => ({ href: `/shop/${r.slug}` as Route, label: r.name }));
  const collections = [
    { href: "/shop/collab" as Route, label: "Collab" },
    { href: "/shop/sale" as Route, label: "Sale" },
  ];
  if (listing.kind === "all") return [...roots, ...collections];
  if (listing.kind === "collection") {
    return [
      { href: "/shop" as Route, label: "Shop all" },
      ...collections.map((c) => ({ ...c, current: c.href === `/shop/${listing.slug}` })),
    ];
  }
  const found = listing.slug ? findCategory(tree, listing.slug) : null;
  if (!found) return [];
  const root = found.parent ?? tree.find((r) => r.slug === found.node.slug);
  if (!root) return [];
  return [
    { href: `/shop/${root.slug}` as Route, label: `All ${root.name.toLowerCase()}`, current: !found.parent },
    ...root.children.map((c) => ({
      href: `/shop/${c.slug}` as Route,
      label: c.name,
      current: c.slug === listing.slug,
    })),
  ];
}
