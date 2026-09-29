import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allShopSlugs, resolveShopListing } from "@/domain/category";
import { pickVariant } from "@/domain/images";
import { listingNavLinks } from "@/lib/shop-nav";
import { env } from "@/server/config/env";
import { getCatalog } from "@/server/catalog/public";
import { ListingView } from "@/components/store/listing/listing-view";

export async function generateStaticParams() {
  const { categories } = await getCatalog();
  return allShopSlugs(categories).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const listing = resolveShopListing(await getCatalog(), slug);
  if (!listing) return { title: "Not found", robots: { index: false } };
  const count = listing.products.length;
  const description =
    `${listing.description ? `${listing.description} ` : ""}${count} ${count === 1 ? "piece" : "pieces"} from USBA Official. Prices in PKR; order on WhatsApp or Instagram.`.trim();
  return {
    title: listing.title,
    description,
    alternates: { canonical: `/shop/${slug}` },
    openGraph: {
      title: `${listing.title} | USBA Official`,
      description,
      url: `/shop/${slug}`,
      images: listing.products[0]?.image
        ? [{ url: pickVariant(listing.products[0].image, 1200), alt: listing.products[0].image.alt }]
        : undefined,
    },
  };
}

export default async function ShopCategoryPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const listing = resolveShopListing(catalog, slug);
  if (!listing) notFound();
  return (
    <ListingView
      listing={listing}
      siteUrl={env().SITE_URL}
      navLinks={listingNavLinks(catalog.categories, listing)}
    />
  );
}
