import type { Route } from "next";
import Link from "next/link";
import type { PublicReview } from "@/server/catalog/queries";
import { StarIcon } from "@/components/ui/icons";
import { ResponsiveImg } from "./responsive-image";

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5 text-cherry">
      <span className="sr-only">Rated {rating} out of 5</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={14} filled={n <= rating} />
      ))}
    </span>
  );
}

export function ReviewCard({ review }: { review: PublicReview }) {
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
            {" on "}
            <Link
              href={`/product/${review.product.slug}` as Route}
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
