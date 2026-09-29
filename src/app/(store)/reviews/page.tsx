import type { Metadata } from "next";
import { getApprovedReviews } from "@/server/catalog/public";
import { ButtonLink } from "@/components/ui/button";
import { ReviewCard } from "@/components/store/review-card";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = {
  title: "Customer reviews",
  description: "Read what USBA customers say about their orders, and share your own experience.",
  alternates: { canonical: "/reviews" },
};

/** CS-12, Flow C-5: approved customer feedback, plus moderated submissions (AS-14). */
export default async function ReviewsPage() {
  const reviews = await getApprovedReviews();
  return (
    <div className="container-page pt-6 md:pt-10">
      <header className="max-w-2xl">
        <h1 className="type-display text-[2.5rem] leading-none md:text-6xl">Customer reviews</h1>
        <p className="mt-4 text-base text-ink-soft">
          Feedback from USBA customers. Every review is checked before it&apos;s published.
        </p>
      </header>

      {reviews.length ? (
        <ul className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4 [&>li]:break-inside-avoid">
          {reviews.map((r) => (
            <li key={r.id}>
              <ReviewCard review={r} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 border border-dashed border-line-strong px-6 py-12 text-center text-ink-soft">
          No reviews yet. Be the first to share how your order went.
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <ButtonLink href="/shop" size="lg">
          Shop the collection
        </ButtonLink>
        <ButtonLink href="/shop?sort=newest" variant="secondary" size="lg">
          See new arrivals
        </ButtonLink>
      </div>

      <section
        aria-labelledby="write-review"
        className="mt-16 grid gap-8 border-t border-line pt-10 lg:grid-cols-12"
      >
        <div className="lg:col-span-4">
          <h2 id="write-review" className="type-title text-3xl">
            Share your experience
          </h2>
          <p className="mt-3 text-sm text-ink-soft">Ordered from USBA? Tell other customers how it went.</p>
        </div>
        <div className="max-w-xl lg:col-span-7">
          <ReviewForm />
        </div>
      </section>
    </div>
  );
}
