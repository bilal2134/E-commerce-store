import type { Metadata, Route } from "next";
import Link from "next/link";
import { Pagination, PageHeader } from "@/components/admin/ui";
import { REVIEW_STATUS_LABELS, REVIEW_STATUSES, type ReviewStatus } from "@/domain/reviews";
import { listProductOptions } from "@/server/admin/products";
import { listReviews, reviewCounts } from "@/server/admin/reviews";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { cn } from "@/lib/cn";
import { thumbUrl } from "../../_lib/media";
import { ReviewForm } from "./_components/review-form";
import { ReviewsList, type ReviewView } from "./_components/reviews-list";

export const metadata: Metadata = { title: "Reviews" };
export const instant = false;

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status: ReviewStatus = (REVIEW_STATUSES as readonly string[]).includes(one(sp.status))
    ? (one(sp.status) as ReviewStatus)
    : "pending";
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  const [counts, list, products] = await Promise.all([
    reviewCounts(db()),
    listReviews(db(), { status, page }),
    listProductOptions(db()),
  ]);

  const rows: ReviewView[] = list.rows.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    body: r.body,
    rating: r.rating,
    status: r.status,
    source: r.source,
    createdAt: r.createdAt.toISOString(),
    productName: r.productName,
    photoUrl: thumbUrl(r.photo),
  }));

  const href = (s: string, p = 1) => `/admin/reviews?status=${s}${p > 1 ? `&page=${p}` : ""}` as Route;

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Approve customer reviews before they appear on the site, or add feedback you received elsewhere."
      />

      <ReviewForm products={products.map((p) => ({ id: p.id, name: p.name, code: p.code }))} />

      <nav aria-label="Filter reviews by status" className="mt-6 mb-4">
        <ul className="flex flex-wrap gap-2">
          {REVIEW_STATUSES.map((s) => {
            const active = s === status;
            return (
              <li key={s}>
                <Link
                  href={href(s)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-sm border px-4 text-sm font-medium",
                    active
                      ? "border-cherry bg-cherry-tint text-cherry-deep"
                      : "border-line-strong bg-surface text-ink-soft hover:border-ink",
                  )}
                >
                  {REVIEW_STATUS_LABELS[s]}
                  <span className="rounded-full bg-white/70 px-2 text-xs tabular-nums">{counts[s]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <ReviewsList rows={rows} status={status} />

      <Pagination
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        hrefFor={(p) => href(status, p)}
        label="Reviews pages"
      />
    </>
  );
}
