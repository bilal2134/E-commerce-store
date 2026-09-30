import type { Route } from "next";
import Link from "next/link";
import type { PublicReview } from "@/server/catalog/queries";
import { StarIcon } from "@/components/ui/icons";
import { localePath } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { ResponsiveImg } from "./responsive-image";

export async function Stars({ rating }: { rating: number }) {
  const { t } = await getI18n();
  return (
    <span className="flex items-center gap-0.5 text-cherry">
      <span className="sr-only">{t.reviews.rated(rating)}</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={14} filled={n <= rating} />
      ))}
    </span>
  );
}

export async function ReviewCard({ review }: { review: PublicReview }) {
  const { locale, t } = await getI18n();
  return (
    <figure className="flex h-full flex-col bg-surface p-5 ring-1 ring-line">
      {review.photo ? (
        <div className="relative -mx-5 -mt-5 mb-4 aspect-[4/5] overflow-hidden bg-blush">
          <ResponsiveImg image={review.photo} sizes="(min-width: 48rem) 30vw, 100vw" />
        </div>
      ) : null}
      {review.rating ? <Stars rating={review.rating} /> : null}
      <blockquote className="mt-3 flex-1 text-base leading-relaxed text-ink">
        <p>{review.body}</p>
      </blockquote>
      <figcaption className="mt-4 text-sm text-ink-soft">
        <span className="font-semibold text-ink">{review.customerName}</span>
        {review.product ? (
          <>
            {` ${t.reviews.on} `}
            <Link
              href={localePath(locale, `/product/${review.product.slug}`) as Route}
              className="underline underline-offset-4 hover:text-cherry"
            >
              {review.product.name}
            </Link>
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}
