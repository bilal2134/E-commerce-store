import type { Metadata, Route } from "next";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { LOW_STOCK_THRESHOLD } from "@/domain/stock";
import { listStock, type StockFilter } from "@/server/admin/stock";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { cn } from "@/lib/cn";
import { thumbUrl } from "../../_lib/media";
import { StockTable, type StockRowView } from "./_components/stock-table";

export const metadata: Metadata = { title: "Stock" };
export const instant = false;

const FILTERS: { value: StockFilter; label: string }[] = [
  { value: "all", label: "All products" },
  { value: "low", label: `Low or sold out (${LOW_STOCK_THRESHOLD} or fewer)` },
  { value: "tracked", label: "Counted" },
  { value: "untracked", label: "Not counted" },
];

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function StockPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 100);
  const filter = FILTERS.find((f) => f.value === one(sp.filter))?.value ?? "all";
  const list = await listStock(db(), { q, filter });

  const rows: StockRowView[] = list.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    categoryName: r.categoryName,
    isVisible: r.isVisible,
    stockStatus: r.stockStatus,
    quantity: r.quantity,
    sizes: r.sizes.map((s) => ({ label: s.label, quantity: s.quantity })),
    thumbUrl: thumbUrl(r.thumb),
    thumbAlt: r.thumb?.alt ?? "",
  }));

  const hrefFor = (f: StockFilter): Route => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (f !== "all") params.set("filter", f);
    const qs = params.toString();
    return `/admin/stock${qs ? `?${qs}` : ""}` as Route;
  };

  return (
    <>
      <PageHeader
        title="Stock"
        description={`Use − and + (or type a number) when stock arrives or sells outside an order. Logging an order takes it from stock and cancelling puts it back. Customers see “Only N left” at ${LOW_STOCK_THRESHOLD} or fewer.`}
      />

      <div className="mb-4 space-y-3 rounded-sm border border-line bg-surface p-3">
        <form method="get" role="search" aria-label="Search stock" className="flex gap-2">
          {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
          <label className="block flex-1 text-sm font-medium">
            <span className="sr-only">Search by name or code</span>
            <Input type="search" name="q" defaultValue={q} placeholder="Search by name or code" />
          </label>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <nav aria-label="Stock filters">
          <ul className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <li key={f.value}>
                <Link
                  href={hrefFor(f.value)}
                  aria-current={f.value === filter ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-sm border px-3 text-sm font-medium",
                    f.value === filter
                      ? "border-ink bg-ink text-petal"
                      : "border-line-strong text-ink-soft hover:border-ink hover:text-ink",
                  )}
                >
                  {f.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={filter === "low" ? "Nothing is running low" : "No products found"}
          action={
            q || filter !== "all" ? (
              <ButtonLink href="/admin/stock" variant="secondary">
                Show all products
              </ButtonLink>
            ) : null
          }
        >
          {filter === "low"
            ? `Every counted product has more than ${LOW_STOCK_THRESHOLD} left.`
            : "Try a different search term or filter."}
        </EmptyState>
      ) : (
        <StockTable rows={rows} />
      )}
    </>
  );
}
