import type { Route } from "next";
import Link from "next/link";
import type { ShopListing } from "@/domain/category";
import { colorFacets, type Listable } from "@/domain/listing";
import { localePath } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/cn";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { ButtonLink } from "@/components/ui/button";
import { JsonLd } from "../json-ld";
import { ProductCard } from "../product-card";
import { Breadcrumbs } from "../breadcrumbs";
import { CategoryViewTracker } from "./category-view-tracker";
import { FilterableListing } from "./filterable-listing";

/** Server-rendered listing page body shared by /shop and /shop/[slug]. */
export async function ListingView({
  listing,
  siteUrl,
  navLinks,
}: {
  listing: ShopListing;
  siteUrl: string;
  /** Sibling/child category links shown as chips (real links, crawlable). */
  navLinks: { href: Route; label: string; current?: boolean }[];
}) {
  const { locale, t } = await getI18n();
  const items: Listable[] = listing.products.map((p) => ({
    id: p.id,
    code: p.code,
    categorySlug: p.categorySlug,
    pricePkr: p.pricePkr,
    salePricePkr: p.salePricePkr,
    stockStatus: p.stockStatus,
    colors: p.colors,
    createdAt: p.createdAt,
    featuredRank: p.featuredRank,
  }));
  // Default ("featured") order is applied client-side as well, so server
  // order must match it to avoid a reorder on hydration.
  const cards = Object.fromEntries(
    listing.products.map((p, i) => [
      p.id,
      <ProductCard key={p.id} product={p} priority={i < 2} headingLevel="h2" showHoverImage />,
    ]),
  );

  return (
    <div className="container-page pt-4 md:pt-6">
      <JsonLd data={breadcrumbJsonLd(siteUrl, listing.breadcrumbs)} />
      {listing.slug ? <CategoryViewTracker slug={listing.slug} /> : null}
      <Breadcrumbs crumbs={listing.breadcrumbs} />
      <header className="mt-4 mb-5 md:mt-6 md:mb-7">
        <h1
          className={cn(
            "type-display text-[2.5rem] leading-none md:text-6xl",
            listing.slug === "sale" ? "text-cherry" : "text-ink",
          )}
        >
          {listing.title}
        </h1>
        {listing.description ? (
          <p className="mt-3 max-w-2xl text-base text-ink-soft">{listing.description}</p>
        ) : null}
      </header>

      {navLinks.length ? (
        <nav aria-label={t.listing.categoriesNav} className="mb-3">
          <ul className="scroller -mx-4 flex gap-2 overflow-x-auto px-4 md:-mx-6 md:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
            {navLinks.map((l) => (
              <li key={l.href} className="shrink-0">
                <Link
                  href={l.href}
                  aria-current={l.current ? "page" : undefined}
                  className="inline-flex h-10 items-center rounded-sm border border-line-strong bg-surface px-4 text-sm text-ink hover:border-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-petal"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {listing.products.length ? (
        <FilterableListing
          items={items}
          cards={cards}
          colors={colorFacets(items)}
          label={t.listing.productsLabel(listing.title)}
          locale={locale}
        />
      ) : (
        <div className="mt-6 border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="type-title text-2xl">{t.listing.nothingHere}</p>
          <p className="mt-2 text-sm text-ink-soft">{t.listing.nothingHereBody}</p>
          <ButtonLink href={localePath(locale, "/shop") as Route} className="mt-5">
            {t.common.shopAll}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
