import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { searchDocs } from "@/domain/search";
import { localePath } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { buildSearchIndex } from "@/server/catalog/search-index";
import { getCatalog } from "@/server/catalog/public";
import { SearchIcon } from "@/components/ui/icons";
import { ProductGrid } from "@/components/store/sections";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    title: t.search.pageTitle,
    robots: { index: false, follow: true },
    alternates: { canonical: localePath(locale, "/search") },
  };
}

/** Full search results (no-JS fallback for the header search, Flow C-2). */
export default async function SearchPage({ searchParams }: PageProps<"/[lang]/search">) {
  const { t } = await getI18n();
  return (
    <div className="container-page pt-6 md:pt-10">
      <h1 className="type-display text-[2.5rem] leading-none md:text-6xl">{t.search.pageTitle}</h1>
      <Suspense fallback={<SearchForm query="" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchForm({ query }: { query: string }) {
  const { locale, t } = await getI18n();
  return (
    <form role="search" action={localePath(locale, "/search")} className="mt-6 flex max-w-xl gap-2">
      <label htmlFor="search-q" className="sr-only">
        {t.search.title}
      </label>
      <input
        id="search-q"
        name="q"
        type="search"
        defaultValue={query}
        placeholder={t.search.placeholder}
        className="h-12 min-w-0 flex-1 rounded-sm border border-control bg-surface px-4 text-base"
      />
      <button
        type="submit"
        className="inline-flex h-12 items-center gap-2 rounded-sm bg-cherry px-5 text-sm font-medium text-white hover:bg-cherry-deep"
      >
        <SearchIcon size={18} />
        {t.search.searchButton}
      </button>
    </form>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/[lang]/search">["searchParams"] }) {
  const params = await searchParams;
  const raw = params.q;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 100).trim() ?? "";
  const [catalog, { locale, t }] = await Promise.all([getCatalog(), getI18n()]);
  const index = buildSearchIndex(catalog);
  const hits = query ? searchDocs(index, query, 48) : [];
  const bySlug = new Map(catalog.products.map((p) => [p.slug, p]));
  const products = hits.map((h) => bySlug.get(h.doc.slug)).filter((p) => p !== undefined);

  return (
    <>
      <SearchForm query={query} />
      {query ? (
        <p className="mt-6 mb-4 text-sm text-ink-soft" role="status">
          {products.length ? t.search.resultsFor(products.length, query) : t.search.noResults(query)}
        </p>
      ) : null}
      {products.length ? (
        <>
          <h2 className="sr-only">{t.search.results}</h2>
          <ProductGrid
            products={products}
            label={t.search.resultsFor(products.length, query)}
            priorityCount={2}
          />
        </>
      ) : query ? (
        <div className="mt-2">
          <p className="text-sm text-ink-soft">{t.search.checkSpelling}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {catalog.categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={localePath(locale, `/shop/${c.slug}`) as Route}
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
