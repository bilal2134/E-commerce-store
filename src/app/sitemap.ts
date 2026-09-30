import type { MetadataRoute } from "next";
import { allShopSlugs } from "@/domain/category";
import { LOCALES, localePath } from "@/i18n/config";
import { env } from "@/server/config/env";
import { getCatalog, getProductSlugs } from "@/server/catalog/public";

/** Every public page in every locale, each with hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = env().SITE_URL;
  const [{ categories }, products] = await Promise.all([getCatalog(), getProductSlugs()]);
  const pages: { path: string; lastModified?: string }[] = [
    ...["/", "/shop", "/about", "/reviews", "/contact", "/size-guide"].map((path) => ({ path })),
    ...allShopSlugs(categories).map((slug) => ({ path: `/shop/${slug}` })),
    ...products.map((p) => ({ path: `/product/${p.slug}`, lastModified: p.updatedAt })),
  ];
  const abs = (path: string) => `${site}${path === "/" ? "" : path}`;
  return pages.flatMap(({ path, lastModified }) =>
    LOCALES.map((locale) => ({
      url: abs(localePath(locale, path)),
      ...(lastModified ? { lastModified } : {}),
      alternates: {
        languages: Object.fromEntries(LOCALES.map((l) => [l, abs(localePath(l, path))])),
      },
    })),
  );
}
