import type { Route } from "next";
import type { CategoryTree } from "@/domain/category";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

/**
 * Primary storefront navigation mirrors the Requirements §11.3 site map.
 * Entries whose category no longer exists are dropped automatically; "clothing"
 * only shows when the shop has no tees/hoodies sub-categories to link instead.
 */
const PRIMARY: { slug: string; key: keyof Dictionary["nav"] }[] = [
  { slug: "heels", key: "heels" },
  { slug: "flats", key: "flats" },
  { slug: "sneakers", key: "sneakers" },
  { slug: "bags", key: "bags" },
  { slug: "tees", key: "tees" },
  { slug: "hoodies", key: "hoodies" },
  { slug: "watches", key: "watches" },
  { slug: "wallets", key: "wallets" },
  { slug: "jewellery", key: "jewellery" },
  { slug: "phone-cases", key: "phoneCases" },
  { slug: "clothing", key: "clothing" },
];

export interface NavLink {
  href: Route;
  label: string;
  emphasis?: boolean;
}

const at = (locale: Locale, path: string) => localePath(locale, path) as Route;

export function primaryNav(
  tree: readonly CategoryTree[],
  locale: Locale,
  t: Dictionary,
  collections: { collab: boolean; sale: boolean } = { collab: true, sale: true },
): NavLink[] {
  const existing = new Set(tree.flatMap((r) => [r.slug, ...r.children.map((c) => c.slug)]));
  const clothingSplit = existing.has("tees") || existing.has("hoodies");
  return [
    ...PRIMARY.filter((p) => existing.has(p.slug) && !(p.slug === "clothing" && clothingSplit)).map((p) => ({
      href: at(locale, `/shop/${p.slug}`),
      label: t.nav[p.key],
    })),
    ...(collections.collab ? [{ href: at(locale, "/shop/collab"), label: t.nav.collab }] : []),
    ...(collections.sale ? [{ href: at(locale, "/shop/sale"), label: t.nav.sale, emphasis: true }] : []),
  ];
}

export function infoLinks(locale: Locale, t: Dictionary): NavLink[] {
  return [
    { href: at(locale, "/about"), label: t.nav.about },
    { href: at(locale, "/reviews"), label: t.nav.reviews },
    { href: at(locale, "/contact"), label: t.nav.contact },
    { href: at(locale, "/size-guide"), label: t.nav.sizeGuide },
  ];
}
