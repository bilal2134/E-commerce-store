import type { Metadata, Route } from "next";
import Link from "next/link";
import { ButtonLink, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { PlusIcon } from "@/components/ui/icons";
import { formatDateTime } from "@/components/admin/format";
import { EmptyState, OrderStatusPill, PageHeader, Pagination } from "@/components/admin/ui";
import { formatPkr } from "@/domain/money";
import { ORDER_CHANNEL_LABELS, ORDER_STATUS_LABELS, ORDER_STATUSES } from "@/domain/orders";
import { listOrders } from "@/server/admin/orders";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Orders" };
export const instant = false;

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 100);
  const status = (ORDER_STATUSES as readonly string[]).includes(one(sp.status)) ? one(sp.status) : "";
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);
  const list = await listOrders(db(), { q, status: status || undefined, page });

  const href = (opts: { status?: string; page?: number }): Route => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    const s = opts.status ?? status;
    if (s) p.set("status", s);
    if (opts.page && opts.page > 1) p.set("page", String(opts.page));
    const qs = p.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}` as Route;
  };

  const tabs = [
    { value: "", label: "All" },
    ...ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] })),
  ];

  return (
    <>
      <PageHeader
        title="Orders"
        description="Log orders that arrive on WhatsApp or Instagram and track them from received to delivered."
        actions={
          <ButtonLink href="/admin/orders/new">
            <PlusIcon size={18} />
            Add manual order
          </ButtonLink>
        }
      />

      <div className="mb-4 space-y-3">
        <nav aria-label="Filter by status" className="scroller -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex gap-2">
            {tabs.map((t) => {
              const active = t.value === status;
              return (
                <li key={t.value || "all"}>
                  <Link
                    href={href({ status: t.value })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-11 items-center rounded-sm border px-4 text-sm font-medium whitespace-nowrap",
                      active
                        ? "border-cherry bg-cherry-tint text-cherry-deep"
                        : "border-line-strong bg-surface text-ink-soft hover:border-ink",
                    )}
                  >
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <form method="get" role="search" aria-label="Search orders" className="flex max-w-xl gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <label className="flex-1">
            <span className="sr-only">Search by customer, phone, order code or product</span>
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by customer, phone, code or product"
            />
          </label>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {list.rows.length === 0 ? (
        <EmptyState
          title={q || status ? "No orders match" : "No orders yet"}
          action={
            q || status ? (
              <ButtonLink href="/admin/orders" variant="secondary">
                Clear filters
              </ButtonLink>
            ) : (
              <ButtonLink href="/admin/orders/new">
                <PlusIcon size={18} />
                Add your first order
              </ButtonLink>
            )
          }
        >
          {q || status
            ? "Try a different search or status."
            : "When a customer orders on WhatsApp or Instagram, add it here so you can follow its progress."}
        </EmptyState>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-sm border border-line bg-surface md:block">
            <table className="w-full min-w-[48rem] text-sm">
              <caption className="sr-only">Orders</caption>
              <thead>
                <tr className="border-b border-line text-muted">
                  <th scope="col" className="px-4 py-3 text-start font-medium">
                    Order
                  </th>
                  <th scope="col" className="px-3 py-3 text-start font-medium">
                    Customer
                  </th>
                  <th scope="col" className="px-3 py-3 text-start font-medium">
                    Items
                  </th>
                  <th scope="col" className="px-3 py-3 text-end font-medium">
                    Total
                  </th>
                  <th scope="col" className="px-3 py-3 text-start font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-medium">
                    Placed
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0 hover:bg-petal">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-medium text-cherry hover:underline"
                      >
                        {o.code}
                      </Link>
                      <p className="text-xs text-muted">{ORDER_CHANNEL_LABELS[o.channel]}</p>
                    </td>
                    <td className="px-3 py-3">
                      {o.customerName}
                      <p className="text-xs text-muted">{o.customerPhone}</p>
                    </td>
                    <td className="max-w-64 truncate px-3 py-3">{o.itemSummary}</td>
                    <td className="px-3 py-3 text-end tabular-nums">{formatPkr(o.totalPkr)}</td>
                    <td className="px-3 py-3">
                      <OrderStatusPill status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{formatDateTime(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {list.rows.map((o) => (
              <li key={o.id} className="rounded-sm border border-line bg-surface">
                <Link href={`/admin/orders/${o.id}`} className="block min-h-11 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-cherry">{o.code}</span>
                    <OrderStatusPill status={o.status} />
                  </div>
                  <p className="mt-1">{o.customerName}</p>
                  <p className="truncate text-sm text-muted">{o.itemSummary}</p>
                  <p className="mt-1 text-sm text-ink-soft tabular-nums">
                    {formatPkr(o.totalPkr)} · {formatDateTime(o.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <Pagination
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        hrefFor={(p) => href({ page: p })}
        label="Orders pages"
      />
    </>
  );
}
