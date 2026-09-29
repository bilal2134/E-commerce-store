import "server-only";
import type { Catalog } from "@/domain/category";
import { pickVariant } from "@/domain/images";
import { BADGE_LABELS, COLOR_LABELS } from "@/domain/catalog";
import type { SearchIndexItem } from "@/domain/search";

/** Build the compact search index from the cached catalogue. */
export function buildSearchIndex(catalog: Catalog): SearchIndexItem[] {
  const rootNames = new Map(catalog.categories.map((r) => [r.slug, r.name]));
  return catalog.products.map((p) => ({
    slug: p.slug,
    name: p.name,
    code: p.code,
    categoryName: p.categoryName,
    rootCategoryName: rootNames.get(p.rootCategorySlug) ?? "",
    colors: p.colors.map((c) => COLOR_LABELS[c]),
    badge: p.badge ? BADGE_LABELS[p.badge] : null,
    collab: p.collabPartner !== null,
    pricePkr: p.pricePkr,
    salePricePkr: p.salePricePkr,
    stockStatus: p.stockStatus,
    thumbUrl: p.image ? pickVariant(p.image, 160) : null,
  }));
}
