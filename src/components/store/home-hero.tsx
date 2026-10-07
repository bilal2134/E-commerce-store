import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { ResponsiveImage } from "@/domain/images";
import type { ProductCard } from "@/domain/product";
import type { Locale } from "@/i18n/config";
import { localePath, localizeHref } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { ButtonLink } from "@/components/ui/button";
import { ResponsiveImg } from "./responsive-image";

export interface HeroContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  image: ResponsiveImage | null;
}

/**
 * Homepage hero: the one loud moment of the storefront. Split screen: the
 * cherry Bodoni headline on the left, the owner's banner running full-bleed to
 * the viewport edge at full hero height. Motion is CSS only (globals.css,
 * "Hero"): the headline rises out of a mask and the image settles from a slight
 * zoom (transform only, so the LCP image paints immediately).
 */
export function HomeHero({
  hero,
  products,
  locale,
  t,
}: {
  hero: HeroContent;
  /** Featured products with photos: the first one stands in when there's no banner. */
  products: ProductCard[];
  locale: Locale;
  t: Dictionary;
}) {
  const at = (path: string) => localePath(locale, path) as Route;
  const title = hero.title || "USBA Official";
  const fallback = hero.image ? null : (products[0] ?? null);
  const image = hero.image ?? fallback?.image ?? null;
  // The headline moves as one block: per-word boxes would re-wrap when Bodoni
  // replaces the fallback font, which counts as layout shift.
  const after = 650;

  const picture = image ? (
    <ResponsiveImg
      image={image}
      sizes="(min-width: 64rem) 50vw, 100vw"
      priority
      alt={fallback ? "" : undefined}
      className="hero-image"
    />
  ) : null;

  return (
    <section aria-labelledby="hero-title" className="hero">
      <div className="flex flex-col lg:grid lg:min-h-[min(calc(100svh-var(--header-height)-2.25rem),54rem)] lg:grid-cols-2">
        {/* From lg the text starts on the page container's edge (aligned with the logo). */}
        <div className="container-page flex flex-col justify-center pt-7 pb-4 md:py-12 lg:mx-0 lg:max-w-none lg:py-16 lg:ps-[max(2.5rem,calc((100vw-90rem)/2+2.5rem))] lg:pe-12 xl:pe-16">
          <div className="lg:max-w-[42rem]">
            {hero.eyebrow ? (
              <p className="hero-fade text-sm font-medium text-ink-soft" style={delay(0)}>
                {hero.eyebrow}
              </p>
            ) : null}
            <h1
              id="hero-title"
              className="hero-title type-hero mt-3 text-[clamp(3.25rem,14vw,5rem)] text-cherry md:text-[clamp(5rem,10vw,7rem)] lg:text-[clamp(4.75rem,6.6vw,7.75rem)]"
              style={delay(80)}
            >
              {title}
            </h1>
            {hero.subtitle ? (
              <p
                className="hero-fade mt-6 max-w-sm text-base text-ink-soft md:text-lg"
                style={delay(after + 100)}
              >
                {hero.subtitle}
              </p>
            ) : null}
            <div
              className="hero-fade mt-8 flex flex-wrap items-center gap-x-7 gap-y-3"
              style={delay(after + 200)}
            >
              <ButtonLink href={localizeHref(locale, hero.ctaHref || "/shop") as Route} size="lg">
                {hero.ctaLabel || t.home.shopNow}
              </ButtonLink>
              <Link href={at("/shop/sale")} className="hero-link text-base font-medium text-ink">
                {t.home.viewSale}
              </Link>
            </div>
          </div>
        </div>

        {picture ? (
          // Full-bleed: edge to edge on small screens, to the viewport edge on desktop.
          // Below lg it comes first, so the headline swapping to Bodoni (a different
          // line wrap than the fallback serif) can't push it down (CLS).
          <div className="relative order-first aspect-[5/4] overflow-hidden bg-blush sm:aspect-[16/9] lg:order-none lg:aspect-auto">
            {fallback ? (
              <Link
                href={at(`/product/${fallback.slug}`)}
                aria-label={fallback.name}
                className="block h-full"
              >
                {picture}
              </Link>
            ) : (
              picture
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Stagger for the load sequence (ms), read by the hero keyframes. */
function delay(ms: number): CSSProperties {
  return { "--hero-delay": `${ms}ms` } as CSSProperties;
}
