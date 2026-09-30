import type { Route } from "next";
import { findCategory, type CategoryTree, type ShopListing } from "@/domain/category";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

/** Chips under a listing title: real links so every category is crawlable. */
export function listingNavLinks(
  tree: readonly CategoryTree[],
  listing: ShopListing,
  locale: Locale,
  t: Dictionary,
): { href: Route; label: string; current?: boolean }[] {
  const at = (path: string) => localePath(locale, path) as Route;
  const roots = tree.map((r) => ({ href: at(`/shop/${r.slug}`), label: r.name }));
  const collections = [
    { slug: "collab", href: at("/shop/collab"), label: t.nav.collab },
    { slug: "sale", href: at("/shop/sale"), label: t.nav.sale },
  ];
  if (listing.kind === "all") return [...roots, ...collections.map(({ href, label }) => ({ href, label }))];
  if (listing.kind === "collection") {
    return [
      { href: at("/shop"), label: t.common.shopAll },
      ...collections.map((c) => ({ href: c.href, label: c.label, current: c.slug === listing.slug })),
    ];
  }
  const found = listing.slug ? findCategory(tree, listing.slug) : null;
  if (!found) return [];
  const root = found.parent ?? tree.find((r) => r.slug === found.node.slug);
  if (!root) return [];
  return [
    { href: at(`/shop/${root.slug}`), label: t.listing.allIn(root.name), current: !found.parent },
    ...root.children.map((c) => ({
      href: at(`/shop/${c.slug}`),
      label: c.name,
      current: c.slug === listing.slug,
    })),
  ];
}
