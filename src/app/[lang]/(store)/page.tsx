import type { Metadata, Route } from "next";
import Link from "next/link";
import { buildHomeSections } from "@/domain/home";
import { env } from "@/server/config/env";
import {
  getApprovedReviews,
  getCatalog,
  getInstagramPosts,
  getLocalizedSettings,
} from "@/server/catalog/public";
import { organizationJsonLd, websiteJsonLd } from "@/lib/structured-data";
import { ButtonLink } from "@/components/ui/button";
import { ClockIcon, InstagramIcon, RulerIcon, WhatsappIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/store/json-ld";
import { HomeHero } from "@/components/store/home-hero";
import { ResponsiveImg } from "@/components/store/responsive-image";
import { ReviewCard } from "@/components/store/review-card";
import { ProductGrid, ProductRail, Section, SectionHeader } from "@/components/store/sections";
import { buildInstagramProfileUrl } from "@/domain/ordering";
import { localePath, pageAlternates } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return { alternates: pageAlternates(locale, "/") };
}

/** Shortcut labels come from the dictionary (keyed by category slug). */
const SHORTCUT_KEYS = {
  heels: "heels",
  sneakers: "sneakers",
  flats: "flats",
  bags: "bags",
  wallets: "wallets",
  jewellery: "jewellery",
  "phone-cases": "phoneCases",
  clothing: "clothing",
} as const;

export default async function HomePage() {
  const [catalog, settings, reviews, instagram, { locale, t }] = await Promise.all([
    getCatalog(),
    getLocalizedSettings(),
    getApprovedReviews(),
    getInstagramPosts(),
    getI18n(),
  ]);
  const at = (path: string) => localePath(locale, path) as Route;
  const home = buildHomeSections(catalog);
  const siteUrl = env().SITE_URL;
  const heroProducts = home.featured.filter((p) => p.image).slice(0, 2);
  const instagramHandles = [settings.instagramHandle, settings.collabInstagramHandle].filter(
    (h): h is string => Boolean(h),
  );

  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd({ siteUrl, instagramHandles: instagramHandles.slice(0, 1) }),
          websiteJsonLd(siteUrl),
        ]}
      />

      <HomeHero hero={settings.hero} products={heroProducts} locale={locale} t={t} />

      {/* Category shortcuts (CS-01) */}
      <section aria-labelledby="shortcuts-title" className="container-page mt-12 md:mt-16">
        <h2 id="shortcuts-title" className="sr-only">
          {t.home.shopByCategory}
        </h2>
        <ul className="scroller -mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-8 md:gap-5 md:overflow-visible md:px-0">
          {home.shortcuts.map((c) => (
            <li key={c.slug} className="w-[27vw] max-w-32 shrink-0 snap-start md:w-auto md:max-w-none">
              <Link href={at(`/shop/${c.slug}`)} className="group block text-center">
                <span className="arch relative block aspect-[4/5] overflow-hidden bg-blush">
                  {c.cover?.image ? (
                    <ResponsiveImg
                      image={c.cover.image}
                      sizes="(min-width: 48rem) 12vw, 27vw"
                      alt=""
                      className="transition-transform duration-700 ease-[var(--ease-out-soft)] [@media(hover:hover)]:group-hover:scale-[1.06]"
                    />
                  ) : null}
                </span>
                <span className="mt-3 block text-sm font-medium text-ink group-hover:text-cherry">
                  {t.nav[SHORTCUT_KEYS[c.slug as keyof typeof SHORTCUT_KEYS]] ?? c.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {home.featured.length ? (
        <Section labelledBy="featured-title">
          <SectionHeader
            id="featured-title"
            title={t.home.featured}
            action={{ href: at("/shop"), label: t.common.shopAll }}
          />
          <ProductGrid products={home.featured} label={t.home.featuredLabel} />
        </Section>
      ) : null}

      {/* How ordering works: three facts, not a sequence. */}
      <section aria-label={t.home.orderingAndDelivery} className="container-page mt-16 md:mt-24">
        <ul className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3">
          <li className="flex items-start gap-3 bg-petal p-5">
            <WhatsappIcon className="mt-0.5 shrink-0 text-whatsapp" />
            <p className="text-sm text-ink-soft">
              <span className="block font-semibold text-ink">{t.home.orderOnWhatsapp}</span>
              {t.home.orderOnWhatsappBody}
            </p>
          </li>
          <li className="flex items-start gap-3 bg-petal p-5">
            <ClockIcon className="mt-0.5 shrink-0 text-cherry" />
            <p className="text-sm text-ink-soft">
              <span className="block font-semibold text-ink">
                {settings.deliverySummary || t.home.delivery}
              </span>
              <Link href={at("/contact")} className="underline underline-offset-4 hover:text-cherry">
                {t.home.deliveryFaq}
              </Link>
            </p>
          </li>
          <li className="flex items-start gap-3 bg-petal p-5">
            <RulerIcon className="mt-0.5 shrink-0 text-cherry" />
            <p className="text-sm text-ink-soft">
              <span className="block font-semibold text-ink">{t.home.findYourSize}</span>
              <Link href={at("/size-guide")} className="underline underline-offset-4 hover:text-cherry">
                {t.home.sizeGuideLink}
              </Link>
            </p>
          </li>
        </ul>
      </section>

      {home.newArrivals.length ? (
        <Section labelledBy="new-title">
          <SectionHeader
            id="new-title"
            title={t.home.newArrivals}
            action={{ href: `${at("/shop")}?sort=newest` as Route, label: t.common.seeAll }}
          />
          <ProductRail products={home.newArrivals.slice(0, 8)} label={t.home.newArrivals} />
        </Section>
      ) : null}

      {home.collab.length ? (
        <section aria-labelledby="collab-title" className="mt-16 bg-ink py-12 text-petal md:mt-24 md:py-16">
          <div className="container-page grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center [&>*]:min-w-0">
            <div className="lg:col-span-5">
              <h2
                id="collab-title"
                className="type-display text-3xl break-words text-petal xs:text-4xl xl:text-5xl"
              >
                {settings.collab.title || t.home.theCollab}
              </h2>
              {settings.collab.body ? (
                <p className="mt-4 max-w-sm text-petal/80">{settings.collab.body}</p>
              ) : null}
              <ButtonLink
                href={at("/shop/collab")}
                variant="secondary"
                size="lg"
                className="mt-6 border-petal bg-petal text-ink hover:bg-ballet"
              >
                {t.home.shopTheCollab}
              </ButtonLink>
            </div>
            <ul className="scroller -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 lg:col-span-7 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
              {home.collab.slice(0, 3).map((p) => (
                <li key={p.id} className="w-[58vw] max-w-72 shrink-0 snap-start lg:w-auto lg:max-w-none">
                  <Link href={at(`/product/${p.slug}`)} className="group block">
                    <span className="relative block aspect-[4/5] overflow-hidden bg-ink-soft">
                      {p.image ? (
                        <ResponsiveImg image={p.image} sizes="(min-width: 64rem) 22vw, 58vw" alt="" />
                      ) : null}
                    </span>
                    <span className="mt-3 block text-sm font-medium text-petal group-hover:underline">
                      {p.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {home.trending.length ? (
        <Section labelledBy="trending-title">
          <SectionHeader id="trending-title" title={t.home.trending} />
          <ProductGrid products={home.trending} label={t.home.trendingLabel} />
        </Section>
      ) : null}

      {home.sale.length ? (
        <Section labelledBy="sale-title">
          <SectionHeader
            id="sale-title"
            title={t.home.onSale}
            tone="cherry"
            description={t.home.onSaleBody}
            action={{ href: at("/shop/sale"), label: t.home.shopTheSale }}
          />
          <ProductRail products={home.sale.slice(0, 8)} label={t.home.saleLabel} />
        </Section>
      ) : null}

      {reviews.length ? (
        <Section labelledBy="reviews-title">
          <SectionHeader
            id="reviews-title"
            title={t.home.reviewsTitle}
            action={{ href: at("/reviews"), label: t.home.seeAllReviews }}
          />
          <ul className="grid gap-4 md:grid-cols-3">
            {reviews.slice(0, 3).map((r) => (
              <li key={r.id}>
                <ReviewCard review={r} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {settings.instagramHandle ? (
        <Section labelledBy="instagram-title">
          <div className="flex flex-col items-start gap-4 border-t border-line pt-10 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id="instagram-title" className="type-title text-3xl">
                @{settings.instagramHandle}
              </h2>
              <p className="mt-2 text-sm text-ink-soft">{t.home.followBody}</p>
            </div>
            <a
              href={buildInstagramProfileUrl(settings.instagramHandle)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-sm border border-line-strong px-5 text-sm font-medium hover:border-ink"
            >
              <InstagramIcon size={18} />
              {t.home.followOnInstagram}
            </a>
          </div>
          {/* CS-22: owner-curated posts (the Instagram API needs Meta app credentials; ADR/ASSUMPTIONS A-16). */}
          {instagram.length ? (
            <ul aria-label={t.home.instagramPosts} className="mt-6 grid grid-cols-3 gap-1 sm:gap-2">
              {instagram.map((post) => (
                <li key={post.id}>
                  <a
                    href={post.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block aspect-square overflow-hidden bg-blush"
                  >
                    <ResponsiveImg
                      image={post.image}
                      sizes="(min-width: 80rem) 470px, 33vw"
                      className="transition-opacity group-hover:opacity-90"
                    />
                    <span className="sr-only"> {t.home.opensInstagram}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      ) : null}
    </>
  );
}
