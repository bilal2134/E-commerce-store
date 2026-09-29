import type { MetadataRoute } from "next";
import { allShopSlugs } from "@/domain/category";
import { env } from "@/server/config/env";
import { getCatalog, getProductSlugs } from "@/server/catalog/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = env().SITE_URL;
  const [{ categories }, products] = await Promise.all([getCatalog(), getProductSlugs()]);
  const staticPages = ["", "/shop", "/about", "/reviews", "/contact", "/size-guide"].map((path) => ({
    url: `${site}${path}`,
  }));
  const shopPages = allShopSlugs(categories).map((slug) => ({ url: `${site}/shop/${slug}` }));
  const productPages = products.map((p) => ({ url: `${site}/product/${p.slug}`, lastModified: p.updatedAt }));
  return [...staticPages, ...shopPages, ...productPages];
}
