import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { ButtonLink } from "@/components/ui/button";
import { CheckIcon, PlusIcon } from "@/components/ui/icons";
import { formatDateTime } from "@/components/admin/format";
import { OrderStatusPill, PageHeader, Panel, EmptyState } from "@/components/admin/ui";
import { formatPkr } from "@/domain/money";
import { getDashboard } from "@/server/admin/dashboard";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Dashboard" };
export const instant = false;

export default async function DashboardPage() {
  await requireAdmin();
  const data = await getDashboard(db());
  const open = data.checklist.filter((c) => !c.done);

  const stats: { label: string; value: number; href: Route }[] = [
    { label: "Total products", value: data.totals.products, href: "/admin/products" },
    {
      label: "Visible on site",
      value: data.totals.visible,
      href: "/admin/products?visibility=visible" as Route,
    },
    {
      label: "Out of stock",
      value: data.totals.outOfStock,
      href: "/admin/products?stock=out_of_stock" as Route,
    },
    { label: "Preorder", value: data.totals.preorder, href: "/admin/products?stock=preorder" as Route },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A quick look at your catalogue, orders and reviews."
        actions={
          <ButtonLink href="/admin/products/new">
            <PlusIcon size={18} />
            Add product
          </ButtonLink>
        }
      />

      <section aria-label="Catalogue summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-sm border border-line bg-surface p-4 transition-colors hover:border-ink-soft"
          >
            <p className="text-sm text-ink-soft">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{s.value}</p>
          </Link>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel
          title="Recent orders"
          action={
            <Link
              href="/admin/orders"
              className="text-sm font-medium text-cherry underline-offset-4 hover:underline"
            >
              View all
            </Link>
          }
        >
          {data.recentOrders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              action={
                <ButtonLink href="/admin/orders/new" variant="secondary">
                  Add a manual order
                </ButtonLink>
              }
            >
              Orders that arrive on WhatsApp or Instagram can be logged here to track their status.
            </EmptyState>
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {data.recentOrders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium hover:text-cherry hover:underline"
                    >
                      {o.code}
                    </Link>
                    <span className="text-ink-soft"> · {o.customerName}</span>
                    <p className="truncate text-sm text-muted">{o.itemSummary}</p>
                  </div>
                  <div className="text-end">
                    <OrderStatusPill status={o.status} />
                    <p className="mt-1 text-sm text-ink-soft tabular-nums">
                      {formatPkr(o.totalPkr)} · {formatDateTime(o.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Reviews">
            <p className="text-3xl font-semibold tabular-nums">{data.pendingReviews}</p>
            <p className="text-sm text-ink-soft">
              {data.pendingReviews === 1 ? "review is" : "reviews are"} waiting for approval
            </p>
            <ButtonLink href="/admin/reviews" variant="secondary" size="sm" className="mt-3">
              {data.pendingReviews > 0 ? "Moderate reviews" : "Open reviews"}
            </ButtonLink>
          </Panel>

          <Panel
            title="Setup checklist"
            description={
              open.length === 0 ? "Everything is set up." : `${open.length} to finish before launch`
            }
          >
            <ul className="space-y-3">
              {data.checklist.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
                      c.done ? "border-success bg-success text-white" : "border-warning bg-warning-tint",
                    )}
                  >
                    {c.done ? <CheckIcon size={12} /> : null}
                  </span>
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">
                      {c.label}
                      <span className="sr-only">{c.done ? " (done)" : " (needs attention)"}</span>
                    </p>
                    <p className="text-muted">{c.detail}</p>
                    {!c.done ? (
                      <Link
                        href={c.href as Route}
                        className="font-medium text-cherry underline-offset-4 hover:underline"
                      >
                        Fix this
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
