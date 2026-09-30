import type { Metadata } from "next";
import { resolveShopListing } from "@/domain/category";
import { localePath, pageAlternates } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { localizeListing } from "@/lib/localize-listing";
import { listingNavLinks } from "@/lib/shop-nav";
import { env } from "@/server/config/env";
import { getCatalog } from "@/server/catalog/public";
import { ListingView } from "@/components/store/listing/listing-view";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    title: t.listing.shopAllTitle,
    description: t.meta.shopAllDescription,
    alternates: pageAlternates(locale, "/shop"),
    openGraph: { title: `${t.listing.shopAllTitle} | ${t.meta.siteName}`, url: localePath(locale, "/shop") },
  };
}

export default async function ShopPage() {
  const [catalog, { locale, t }] = await Promise.all([getCatalog(), getI18n()]);
  const listing = localizeListing(resolveShopListing(catalog, null)!, locale, t);
  return (
    <ListingView
      listing={listing}
      siteUrl={env().SITE_URL}
      navLinks={listingNavLinks(catalog.categories, listing, locale, t)}
    />
  );
}
