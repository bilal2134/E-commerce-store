import type { Route } from "next";
import Link from "next/link";
import { displayBadge, type ProductCard as ProductCardData } from "@/domain/product";
import { localePath } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/cn";
import { BadgeTag, StockTag } from "./badge-tag";
import { Price } from "./price";
import { ResponsiveImg } from "./responsive-image";
import { SaveButton } from "./saved/save-button";

/** Grid sizes: 2 cols mobile, 3 tablet, 4 desktop (max container 1440px). */
export const CARD_SIZES = "(min-width: 80rem) 330px, (min-width: 64rem) 24vw, (min-width: 48rem) 32vw, 48vw";

export async function ProductCard({
  product,
  priority = false,
  sizes = CARD_SIZES,
  headingLevel = "h3",
  showHoverImage = false,
}: {
  product: ProductCardData;
  priority?: boolean;
  sizes?: string;
  headingLevel?: "h2" | "h3";
  /** Second photo on hover (pointer devices); used on listing grids only. */
  showHoverImage?: boolean;
}) {
  const { locale, t } = await getI18n();
  const Heading = headingLevel;
  const soldOut = product.stockStatus === "out_of_stock";
  const badge = displayBadge(product);
  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden bg-blush">
        {product.image ? (
          <ResponsiveImg
            image={product.image}
            sizes={sizes}
            priority={priority}
            className={cn(
              "transition-transform duration-700 ease-[var(--ease-out-soft)] [@media(hover:hover)]:group-hover:scale-[1.04]",
              soldOut && "opacity-70 grayscale-[35%]",
            )}
          />
        ) : null}
        {showHoverImage && product.hoverImage && !soldOut ? (
          <ResponsiveImg
            image={product.hoverImage}
            sizes={sizes}
            alt=""
            className="absolute inset-0 opacity-0 transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] [@media(hover:hover)]:group-hover:scale-[1.04] [@media(hover:hover)]:group-hover:opacity-100"
          />
        ) : null}
        <div className="pointer-events-none absolute start-2 top-2 flex flex-col items-start gap-1">
          {badge ? <BadgeTag badge={badge} /> : null}
          {product.stockStatus !== "in_stock" ? <StockTag status={product.stockStatus} /> : null}
        </div>
        <SaveButton slug={product.slug} name={product.name} />
      </div>
      <div className="flex flex-1 flex-col gap-1 pt-3">
        <Heading className="text-sm leading-snug font-medium text-ink">
          {/* Stretched link: the whole card is one tap target with one accessible name. */}
          <Link
            href={localePath(locale, `/product/${product.slug}`) as Route}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-cherry"
          >
            {product.name}
          </Link>
        </Heading>
        {product.collabPartner ? (
          <p className="text-xs text-muted">{t.product.withPartner(product.collabPartner)}</p>
        ) : null}
        <Price pricePkr={product.pricePkr} salePricePkr={product.salePricePkr} />
      </div>
    </article>
  );
}
