import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { searchDocs } from "@/domain/search";
import { buildSearchIndex } from "@/server/catalog/search-index";
import { getCatalog } from "@/server/catalog/public";
import { SearchIcon } from "@/components/ui/icons";
import { ProductGrid } from "@/components/store/sections";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};

/** Full search results (no-JS fallback for the header search, Flow C-2). */
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="container-page pt-6 md:pt-10">
      <h1 className="type-display text-[2.5rem] leading-none md:text-6xl">Search</h1>
      <Suspense fallback={<SearchForm query="" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function SearchForm({ query }: { query: string }) {
  return (
    <form role="search" action="/search" className="mt-6 flex max-w-xl gap-2">
      <label htmlFor="search-q" className="sr-only">
        Search products
      </label>
      <input
        id="search-q"
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Search heels, bags, wallets…"
        className="h-12 min-w-0 flex-1 rounded-sm border border-line-strong bg-surface px-4 text-base"
      />
      <button
        type="submit"
        className="inline-flex h-12 items-center gap-2 rounded-sm bg-cherry px-5 text-sm font-medium text-white hover:bg-cherry-deep"
      >
        <SearchIcon size={18} />
        Search
      </button>
    </form>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const params = await searchParams;
  const raw = params.q;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 100).trim() ?? "";
  const catalog = await getCatalog();
  const index = buildSearchIndex(catalog);
  const hits = query ? searchDocs(index, query, 48) : [];
  const bySlug = new Map(catalog.products.map((p) => [p.slug, p]));
  const products = hits.map((h) => bySlug.get(h.doc.slug)).filter((p) => p !== undefined);

  return (
    <>
      <SearchForm query={query} />
      {query ? (
        <p className="mt-6 mb-4 text-sm text-ink-soft" role="status">
          {products.length
            ? `${products.length} ${products.length === 1 ? "result" : "results"} for “${query}”`
            : `No products match “${query}”.`}
        </p>
      ) : null}
      {products.length ? (
        <ProductGrid products={products} label={`Search results for ${query}`} priorityCount={2} />
      ) : query ? (
        <div className="mt-2">
          <p className="text-sm text-ink-soft">Check the spelling or browse a category:</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {catalog.categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/shop/${c.slug}` as Route}
                  className="inline-flex h-10 items-center rounded-sm border border-line-strong px-4 text-sm hover:border-ink"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
