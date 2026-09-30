import type { Metadata, Route } from "next";
import { localePath, pageAlternates } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { getApprovedReviews } from "@/server/catalog/public";
import { ButtonLink } from "@/components/ui/button";
import { ReviewCard } from "@/components/store/review-card";
import { ReviewForm } from "./review-form";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    title: t.reviews.title,
    description: t.reviews.metaDescription,
    alternates: pageAlternates(locale, "/reviews"),
  };
}

/** CS-12, Flow C-5: approved customer feedback, plus moderated submissions (AS-14). */
export default async function ReviewsPage() {
  const [reviews, { locale, t }] = await Promise.all([getApprovedReviews(), getI18n()]);
  const at = (path: string) => localePath(locale, path) as Route;
  return (
    <div className="container-page pt-6 md:pt-10">
      <header className="max-w-2xl">
        <h1 className="type-display text-[2.5rem] leading-none md:text-6xl">{t.reviews.title}</h1>
        <p className="mt-4 text-base text-ink-soft">{t.reviews.intro}</p>
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
          {t.reviews.empty}
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <ButtonLink href={at("/shop")} size="lg">
          {t.reviews.shopCollection}
        </ButtonLink>
        <ButtonLink href={`${at("/shop")}?sort=newest` as Route} variant="secondary" size="lg">
          {t.reviews.seeNewArrivals}
        </ButtonLink>
      </div>

      <section
        aria-labelledby="write-review"
        className="mt-16 grid gap-8 border-t border-line pt-10 lg:grid-cols-12"
      >
        <div className="lg:col-span-4">
          <h2 id="write-review" className="type-title text-3xl">
            {t.reviews.shareTitle}
          </h2>
          <p className="mt-3 text-sm text-ink-soft">{t.reviews.shareBody}</p>
        </div>
        <div className="max-w-xl lg:col-span-7">
          <ReviewForm locale={locale} />
        </div>
      </section>
    </div>
  );
}
