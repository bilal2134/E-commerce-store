import type { Crumb, ShopListing } from "@/domain/category";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

/** Localized breadcrumb trail: fixed crumbs translated, every href locale-prefixed. */
export function localizeCrumbs(crumbs: readonly Crumb[], locale: Locale, t: Dictionary): Crumb[] {
  const fixed: Record<string, string> = {
    "/": t.common.home,
    "/shop": t.common.shop,
    "/shop/collab": t.listing.collabTitle,
    "/shop/sale": t.listing.saleTitle,
  };
  return crumbs.map((c) => ({ name: fixed[c.href] ?? c.name, href: localePath(locale, c.href) }));
}

/**
 * Titles/descriptions for virtual listings (all, collab, sale) come from the
 * dictionary; category names and descriptions are owner content from the DB.
 */
export function localizeListing(listing: ShopListing, locale: Locale, t: Dictionary): ShopListing {
  const copy: Partial<Pick<ShopListing, "title" | "description">> =
    listing.kind === "all"
      ? { title: t.listing.shopAllTitle, description: t.listing.shopAllDescription }
      : listing.slug === "collab"
        ? { title: t.listing.collabTitle, description: t.listing.collabDescription }
        : listing.slug === "sale"
          ? { title: t.listing.saleTitle, description: t.listing.saleDescription }
          : {};
  return { ...listing, ...copy, breadcrumbs: localizeCrumbs(listing.breadcrumbs, locale, t) };
}
