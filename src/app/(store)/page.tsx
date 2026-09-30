import type { Metadata, Route } from "next";
import Link from "next/link";
import { buildHomeSections } from "@/domain/home";
import { env } from "@/server/config/env";
import { getApprovedReviews, getCatalog, getInstagramPosts, getSettings } from "@/server/catalog/public";
import { organizationJsonLd, websiteJsonLd } from "@/lib/structured-data";
import { ButtonLink } from "@/components/ui/button";
import { ClockIcon, InstagramIcon, RulerIcon, WhatsappIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/store/json-ld";
import { ResponsiveImg } from "@/components/store/responsive-image";
import { ReviewCard } from "@/components/store/review-card";
import { ProductGrid, ProductRail, Section, SectionHeader } from "@/components/store/sections";
import { buildInstagramProfileUrl } from "@/domain/ordering";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [catalog, settings, reviews, instagram] = await Promise.all([
    getCatalog(),
    getSettings(),
    getApprovedReviews(),
    getInstagramPosts(),
  ]);
  const home = buildHomeSections(catalog);
  const siteUrl = env().SITE_URL;
  const heroProducts = home.featured.filter((p) => p.image).slice(0, 2);
  const hero = settings.hero;
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

      {/* Hero: oversized Bodoni headline is the single loud element of the page. */}
      <section aria-labelledby="hero-title" className="container-page pt-6 md:pt-10">
        <div className="grid items-end gap-6 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-6 md:pb-10 lg:col-span-7">
            {hero.eyebrow ? <p className="text-sm font-medium text-ink-soft">{hero.eyebrow}</p> : null}
            <h1
              id="hero-title"
              className="type-display mt-2 text-[2.75rem] leading-[0.98] text-cherry xs:text-5xl md:text-6xl lg:text-[5.5rem] lg:leading-[0.95]"
            >
              {hero.title || "USBA Official"}
            </h1>
            {hero.subtitle ? (
              <p className="mt-5 max-w-md text-base text-ink-soft md:text-lg">{hero.subtitle}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={(hero.ctaHref || "/shop") as Route} size="lg" className="w-full xs:w-auto">
                {hero.ctaLabel || "Shop now"}
              </ButtonLink>
              <ButtonLink href="/shop/sale" variant="secondary" size="lg" className="w-full xs:w-auto">
                View sale
              </ButtonLink>
            </div>
          </div>
          <div className="md:col-span-6 lg:col-span-5">
            {hero.image ? (
              <div className="relative aspect-[4/5] overflow-hidden bg-blush">
                <ResponsiveImg
                  image={hero.image}
                  sizes="(min-width: 64rem) 40vw, (min-width: 48rem) 50vw, 100vw"
                  priority
                />
              </div>
            ) : heroProducts.length ? (
              <div className="grid grid-cols-2 items-end gap-3">
                {heroProducts.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/product/${p.slug}` as Route}
                    className={i === 0 ? "block" : "block md:mb-12"}
                    aria-label={p.name}
                  >
                    <span className="relative block aspect-[4/5] overflow-hidden bg-blush">
                      {p.image ? (
                        <ResponsiveImg
                          image={p.image}
                          sizes="(min-width: 64rem) 20vw, (min-width: 48rem) 25vw, 50vw"
                          priority
                          alt=""
                        />
                      ) : null}
                    </span>
                    <span className="mt-2 block text-sm text-ink-soft">{p.name}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Category shortcuts (CS-01) */}
      <section aria-labelledby="shortcuts-title" className="container-page mt-12 md:mt-16">
        <h2 id="shortcuts-title" className="sr-only">
          Shop by category
        </h2>
        <ul className="scroller -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-8 md:overflow-visible md:px-0">
          {home.shortcuts.map((c) => (
            <li key={c.slug} className="w-[27vw] max-w-32 shrink-0 snap-start md:w-auto md:max-w-none">
              <Link href={`/shop/${c.slug}` as Route} className="group block">
                <span className="relative block aspect-[4/5] overflow-hidden bg-blush">
                  {c.cover?.image ? (
                    <ResponsiveImg image={c.cover.image} sizes="(min-width: 48rem) 12vw, 27vw" alt="" />
                  ) : null}
                </span>
                <span className="mt-2 block text-sm font-medium text-ink group-hover:text-cherry">
                  {c.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {home.featured.length ? (
        <Section labelledBy="featured-title">
          <SectionHeader id="featured-title" title="Featured" action={{ href: "/shop", label: "Shop all" }} />
          <ProductGrid products={home.featured} label="Featured products" />
        </Section>
      ) : null}

      {/* How ordering works: three facts, not a sequence. */}
      <section aria-label="Ordering and delivery" className="container-page mt-16 md:mt-24">
        <ul className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3">
          <li className="flex items-start gap-3 bg-petal p-5">
            <WhatsappIcon className="mt-0.5 shrink-0 text-whatsapp" />
            <p className="text-sm text-ink-soft">
              <span className="block font-semibold text-ink">Order on WhatsApp</span>
              Pick your item and size, and the order message is written for you.
            </p>
          </li>
          <li className="flex items-start gap-3 bg-petal p-5">
            <ClockIcon className="mt-0.5 shrink-0 text-cherry" />
            <p className="text-sm text-ink-soft">
              <span className="block font-semibold text-ink">{settings.deliverySummary || "Delivery"}</span>
              <Link href="/contact" className="underline underline-offset-4 hover:text-cherry">
                Delivery and ordering FAQ
              </Link>
            </p>
          </li>
          <li className="flex items-start gap-3 bg-petal p-5">
            <RulerIcon className="mt-0.5 shrink-0 text-cherry" />
            <p className="text-sm text-ink-soft">
              <span className="block font-semibold text-ink">Find your size</span>
              <Link href="/size-guide" className="underline underline-offset-4 hover:text-cherry">
                Footwear size guide
              </Link>
            </p>
          </li>
        </ul>
      </section>

      {home.newArrivals.length ? (
        <Section labelledBy="new-title">
          <SectionHeader
            id="new-title"
            title="New arrivals"
            action={{ href: "/shop?sort=newest" as Route, label: "See all" }}
          />
          <ProductRail products={home.newArrivals.slice(0, 8)} label="New arrivals" />
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
                {settings.collab.title || "The collab"}
              </h2>
              {settings.collab.body ? (
                <p className="mt-4 max-w-sm text-petal/80">{settings.collab.body}</p>
              ) : null}
              <ButtonLink
                href="/shop/collab"
                variant="secondary"
                size="lg"
                className="mt-6 border-petal bg-petal text-ink hover:bg-ballet"
              >
                Shop the collab
              </ButtonLink>
            </div>
            <ul className="scroller -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 lg:col-span-7 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
              {home.collab.slice(0, 3).map((p) => (
                <li key={p.id} className="w-[58vw] max-w-72 shrink-0 snap-start lg:w-auto lg:max-w-none">
                  <Link href={`/product/${p.slug}` as Route} className="group block">
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
          <SectionHeader id="trending-title" title="Trending now" />
          <ProductGrid products={home.trending} label="Trending products" />
        </Section>
      ) : null}

      {home.sale.length ? (
        <Section labelledBy="sale-title">
          <SectionHeader
            id="sale-title"
            title="On sale"
            tone="cherry"
            description="Special prices, original prices shown crossed out."
            action={{ href: "/shop/sale", label: "Shop the sale" }}
          />
          <ProductRail products={home.sale.slice(0, 8)} label="Sale products" />
        </Section>
      ) : null}

      {reviews.length ? (
        <Section labelledBy="reviews-title">
          <SectionHeader
            id="reviews-title"
            title="What our customers say"
            action={{ href: "/reviews", label: "See all reviews" }}
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
              <p className="mt-2 text-sm text-ink-soft">Follow USBA on Instagram for new drops.</p>
            </div>
            <a
              href={buildInstagramProfileUrl(settings.instagramHandle)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-sm border border-line-strong px-5 text-sm font-medium hover:border-ink"
            >
              <InstagramIcon size={18} />
              Follow on Instagram
            </a>
          </div>
          {/* CS-22: owner-curated posts (the Instagram API needs Meta app credentials; ADR/ASSUMPTIONS A-16). */}
          {instagram.length ? (
            <ul aria-label="Latest Instagram posts" className="mt-6 grid grid-cols-3 gap-1 sm:gap-2">
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
                    <span className="sr-only"> (opens Instagram)</span>
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
