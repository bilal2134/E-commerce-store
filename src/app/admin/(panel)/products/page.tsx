import type { Metadata, Route } from "next";
import Link from "next/link";
import { ButtonLink, Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { PlusIcon } from "@/components/ui/icons";
import { EmptyState, PageHeader, Pagination } from "@/components/admin/ui";
import { BADGE_LABELS, BADGES, STOCK_STATUS_LABELS, STOCK_STATUSES } from "@/domain/catalog";
import { listCategoryGroups, listProducts } from "@/server/admin/products";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { thumbUrl } from "../../_lib/media";
import { ProductsTable, type ProductRowView } from "./_components/products-table";

export const metadata: Metadata = { title: "Products" };
export const instant = false;

type Search = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 100);
  const category = one(sp.category);
  const badge =
    (BADGES as readonly string[]).includes(one(sp.badge)) || one(sp.badge) === "none" ? one(sp.badge) : "";
  const stock = (STOCK_STATUSES as readonly string[]).includes(one(sp.stock)) ? one(sp.stock) : "";
  const visibility =
    one(sp.visibility) === "visible" || one(sp.visibility) === "hidden"
      ? (one(sp.visibility) as "visible" | "hidden")
      : undefined;
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  const [groups, list] = await Promise.all([
    listCategoryGroups(db()),
    listProducts(db(), {
      q,
      categoryId: /^[0-9a-f-]{36}$/i.test(category) ? category : undefined,
      badge: badge || undefined,
      stock: stock || undefined,
      visibility,
      page,
    }),
  ]);

  const rows: ProductRowView[] = list.rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    categoryName: r.categoryName,
    pricePkr: r.pricePkr,
    salePricePkr: r.salePricePkr,
    stockStatus: r.stockStatus,
    badge: r.badge ? (BADGE_LABELS[r.badge as keyof typeof BADGE_LABELS] ?? r.badge) : null,
    isVisible: r.isVisible,
    featured: r.featuredRank !== null,
    imageCount: r.imageCount,
    thumbUrl: thumbUrl(r.thumb),
    thumbAlt: r.thumb?.alt ?? "",
  }));

  const filtered = Boolean(q || category || badge || stock || visibility);
  const hrefFor = (p: number): string => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (badge) params.set("badge", badge);
    if (stock) params.set("stock", stock);
    if (visibility) params.set("visibility", visibility);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/products${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="Add, edit, hide or remove what customers see in the shop."
        actions={
          <>
            <ButtonLink href="/admin/products/featured" variant="secondary">
              Homepage order
            </ButtonLink>
            <ButtonLink href="/admin/products/new">
              <PlusIcon size={18} />
              Add product
            </ButtonLink>
          </>
        }
      />

      <form
        method="get"
        role="search"
        aria-label="Filter products"
        className="mb-4 grid gap-3 rounded-sm border border-line bg-surface p-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="block text-sm font-medium lg:col-span-2">
          <span className="sr-only">Search by name or code</span>
          <Input type="search" name="q" defaultValue={q} placeholder="Search by name or code" />
        </label>
        <label className="block text-sm font-medium">
          <span className="sr-only">Category</span>
          <Select name="category" defaultValue={category}>
            <option value="">All categories</option>
            {groups.map((g) => (
              <optgroup key={g.rootSlug} label={g.rootName}>
                {g.children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </label>
        <label className="block text-sm font-medium">
          <span className="sr-only">Badge</span>
          <Select name="badge" defaultValue={badge}>
            <option value="">Any badge</option>
            <option value="none">No badge</option>
            {BADGES.map((b) => (
              <option key={b} value={b}>
                {BADGE_LABELS[b]}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm font-medium">
          <span className="sr-only">Stock status</span>
          <Select name="stock" defaultValue={stock}>
            <option value="">Any stock status</option>
            {STOCK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STOCK_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm font-medium">
          <span className="sr-only">Visibility</span>
          <Select name="visibility" defaultValue={visibility ?? ""}>
            <option value="">Visible and hidden</option>
            <option value="visible">Visible only</option>
            <option value="hidden">Hidden only</option>
          </Select>
        </label>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="secondary">
            Apply filters
          </Button>
          {filtered ? (
            <Link
              href={"/admin/products" as Route}
              className="inline-flex h-11 items-center px-2 text-sm font-medium text-cherry underline-offset-4 hover:underline"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState
            title="No products match these filters"
            action={
              <ButtonLink href="/admin/products" variant="secondary">
                Clear filters
              </ButtonLink>
            }
          >
            Try a different search term or remove a filter.
          </EmptyState>
        ) : (
          <EmptyState
            title="No products yet"
            action={
              <ButtonLink href="/admin/products/new">
                <PlusIcon size={18} />
                Add your first product
              </ButtonLink>
            }
          >
            Products you add appear on the site as soon as you save them and mark them visible.
          </EmptyState>
        )
      ) : (
        <ProductsTable rows={rows} />
      )}

      <Pagination
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        hrefFor={hrefFor}
        label="Products pages"
      />
    </>
  );
}
