import type { Metadata } from "next";
import { resolveShopListing } from "@/domain/category";
import { listingNavLinks } from "@/lib/shop-nav";
import { env } from "@/server/config/env";
import { getCatalog } from "@/server/catalog/public";
import { ListingView } from "@/components/store/listing/listing-view";

export const metadata: Metadata = {
  title: "Shop all",
  description:
    "Shop all USBA pieces: heels, sneakers, flats, bags, wallets, jewellery, phone cases and clothing. Prices in PKR; order on WhatsApp.",
  alternates: { canonical: "/shop" },
  openGraph: { title: "Shop all | USBA Official", url: "/shop" },
};

export default async function ShopPage() {
  const catalog = await getCatalog();
  const listing = resolveShopListing(catalog, null)!;
  return (
    <ListingView
      listing={listing}
      siteUrl={env().SITE_URL}
      navLinks={listingNavLinks(catalog.categories, listing)}
    />
  );
}
