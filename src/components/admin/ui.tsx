import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { STOCK_STATUS_LABELS, type StockStatus } from "@/domain/catalog";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/domain/orders";
import { REVIEW_STATUS_LABELS, type ReviewStatus } from "@/domain/reviews";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back ? (
        <Link
          href={back.href as Route}
          className="mb-2 inline-flex min-h-8 items-center gap-1 text-sm text-ink-soft hover:text-cherry"
        >
          <ChevronLeftIcon size={16} />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="type-title text-3xl">{title}</h1>
          {description ? <p className="mt-1 max-w-prose text-sm text-ink-soft">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  children,
  className,
  id,
  action,
}: {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  action?: ReactNode;
}) {
  return (
    <section id={id} className={cn("rounded-sm border border-line bg-surface", className)}>
      {title ? (
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-sm border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <p className="text-base font-semibold">{title}</p>
      {children ? <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{children}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

const pill = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function StockPill({ status }: { status: StockStatus }) {
  const tone =
    status === "in_stock"
      ? "bg-success-tint text-success"
      : status === "preorder"
        ? "bg-warning-tint text-warning"
        : "bg-danger-tint text-danger";
  return <span className={cn(pill, tone)}>{STOCK_STATUS_LABELS[status]}</span>;
}

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  const tone =
    status === "delivered"
      ? "bg-success-tint text-success"
      : status === "cancelled"
        ? "bg-danger-tint text-danger"
        : status === "received"
          ? "bg-blush text-cherry-deep"
          : "bg-warning-tint text-warning";
  return <span className={cn(pill, tone)}>{ORDER_STATUS_LABELS[status]}</span>;
}

export function ReviewStatusPill({ status }: { status: ReviewStatus }) {
  const tone =
    status === "approved"
      ? "bg-success-tint text-success"
      : status === "rejected"
        ? "bg-danger-tint text-danger"
        : "bg-warning-tint text-warning";
  return <span className={cn(pill, tone)}>{REVIEW_STATUS_LABELS[status]}</span>;
}

export function Pagination({
  page,
  pageSize,
  total,
  hrefFor,
  label,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
  label: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const linkClass =
    "inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-sm border border-line-strong bg-surface px-3 text-sm font-medium hover:border-ink";
  const disabled = "pointer-events-none opacity-40";
  return (
    <nav aria-label={label} className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={hrefFor(page - 1) as Route}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={cn(linkClass, page <= 1 && disabled)}
        >
          <ChevronLeftIcon size={16} />
          Previous
        </Link>
        <span className="text-sm text-ink-soft">
          Page {page} of {pages}
        </span>
        <Link
          href={hrefFor(page + 1) as Route}
          aria-disabled={page >= pages}
          tabIndex={page >= pages ? -1 : undefined}
          className={cn(linkClass, page >= pages && disabled)}
        >
          Next
          <ChevronRightIcon size={16} />
        </Link>
      </div>
    </nav>
  );
}

/** Product/review thumbnail from a stored image's smallest variant. */
export function Thumb({
  src,
  alt = "",
  className,
}: {
  src: string | null;
  alt?: string;
  className?: string;
}) {
  if (!src) {
    return (
      <span
        aria-hidden="true"
        className={cn("inline-flex items-center justify-center bg-blush text-2xs text-muted", className)}
      >
        No photo
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- variants are pre-generated WebP (ADR-0006)
  return <img src={src} alt={alt} loading="lazy" className={cn("bg-blush object-cover", className)} />;
}
