import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allShopSlugs, resolveShopListing } from "@/domain/category";
import { pickVariant } from "@/domain/images";
import { localePath, pageAlternates } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { localizeListing } from "@/lib/localize-listing";
import { baseOpenGraph, DEFAULT_SHARE_IMAGE } from "@/lib/open-graph";
import { listingNavLinks } from "@/lib/shop-nav";
import { env } from "@/server/config/env";
import { getCatalog } from "@/server/catalog/public";
import { ListingView } from "@/components/store/listing/listing-view";

export async function generateStaticParams() {
  const { categories } = await getCatalog();
  return allShopSlugs(categories).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [catalog, { locale, t }] = await Promise.all([getCatalog(), getI18n()]);
  const raw = resolveShopListing(catalog, slug);
  if (!raw) return { title: t.meta.notFoundTitle, robots: { index: false } };
  const listing = localizeListing(raw, locale, t);
  const description = `${listing.description ? `${listing.description} ` : ""}${t.meta.listingDescriptionSuffix(listing.products.length)}`;
  return {
    title: listing.title,
    description,
    alternates: pageAlternates(locale, `/shop/${slug}`),
    openGraph: {
      ...baseOpenGraph(locale, t),
      title: `${listing.title} | ${t.meta.siteName}`,
      description,
      url: localePath(locale, `/shop/${slug}`),
      images: listing.products[0]?.image
        ? [{ url: pickVariant(listing.products[0].image, 1200), alt: listing.products[0].image.alt }]
        : [DEFAULT_SHARE_IMAGE],
    },
  };
}

export default async function ShopCategoryPage({ params }: PageProps<"/[lang]/shop/[slug]">) {
  const { slug } = await params;
  const [catalog, { locale, t }] = await Promise.all([getCatalog(), getI18n()]);
  const raw = resolveShopListing(catalog, slug);
  if (!raw) notFound();
  const listing = localizeListing(raw, locale, t);
  return (
    <ListingView
      listing={listing}
      siteUrl={env().SITE_URL}
      navLinks={listingNavLinks(catalog.categories, listing, locale, t)}
    />
  );
}
