"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { formatPkr, priceInfo } from "@/domain/money";
import { searchDocs, type SearchIndexItem } from "@/domain/search";
import { track } from "@/lib/analytics";
import { SearchIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";

let indexPromise: Promise<SearchIndexItem[]> | null = null;
function loadIndex(): Promise<SearchIndexItem[]> {
  indexPromise ??= fetch("/api/search-index")
    .then((r) => (r.ok ? (r.json() as Promise<SearchIndexItem[]>) : []))
    .catch(() => {
      indexPromise = null;
      return [];
    });
  return indexPromise;
}

/**
 * Header search (CS-10, Flow C-2): WAI-ARIA combobox with a listbox of live
 * suggestions. Without JavaScript the trigger is a plain link to /search.
 */
export function SearchDialog({ quickLinks }: { quickLinks: { href: Route; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchIndexItem[] | null>(null);
  const [active, setActive] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const statusId = useId();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadIndex().then((items) => {
      if (!cancelled) setIndex(items);
    });
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelled = true;
    };
  }, [open]);

  const results = useMemo(
    () => (index && query.trim() ? searchDocs(index, query, 8).map((h) => h.doc) : []),
    [index, query],
  );

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  const go = useCallback(
    (href: Route) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const q = query.trim();

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (results.length ? (a + 1) % results.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (results.length ? (a <= 0 ? results.length - 1 : a - 1) : -1));
    } else if (e.key === "Enter" && active >= 0 && results[active]) {
      e.preventDefault();
      track("search", { query: q.slice(0, 60), selected: true });
      go(`/product/${results[active].slug}` as Route);
    }
  }

  return (
    <>
      {/* Plain link on purpose: without JS it navigates; with JS it opens the sheet. */}
      <a
        href="/search"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        aria-haspopup="dialog"
        className="inline-flex size-11 items-center justify-center gap-2 rounded-sm text-ink hover:bg-blush lg:w-auto lg:px-3"
      >
        <SearchIcon />
        <span className="sr-only lg:not-sr-only lg:text-sm">Search</span>
      </a>
      <Sheet open={open} onClose={close} title="Search products" side="top" hideTitle>
        <form
          role="search"
          action="/search"
          onSubmit={(e) => {
            e.preventDefault();
            if (!q) return;
            track("search", { query: q.slice(0, 60), selected: false });
            go(`/search?q=${encodeURIComponent(q)}` as Route);
          }}
          className="flex items-center gap-2 border-b border-line px-4 py-3"
        >
          <SearchIcon className="shrink-0 text-muted" />
          <label htmlFor={`${listId}-input`} className="sr-only">
            Search products
          </label>
          <input
            ref={inputRef}
            id={`${listId}-input`}
            name="q"
            type="search"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
            aria-describedby={statusId}
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Search heels, bags, wallets…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
            className="h-12 min-w-0 flex-1 bg-transparent text-lg text-ink placeholder:text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={close}
            className="h-11 px-2 text-sm font-medium text-ink-soft hover:text-ink"
          >
            Cancel
          </button>
        </form>

        <p id={statusId} className="sr-only" aria-live="polite">
          {q ? (index ? `${results.length} suggestions available` : "Loading suggestions") : ""}
        </p>

        <div className="px-2 py-2">
          {q && results.length > 0 ? (
            <>
              <ul id={listId} role="listbox" aria-label="Suggestions" className="flex flex-col">
                {results.map((item, i) => {
                  const price = priceInfo(item.pricePkr, item.salePricePkr);
                  return (
                    <li
                      key={item.slug}
                      id={`${listId}-opt-${i}`}
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => {
                        track("search", { query: q.slice(0, 60), selected: true });
                        go(`/product/${item.slug}` as Route);
                      }}
                      className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2 aria-selected:bg-blush"
                    >
                      <span className="block h-15 w-12 shrink-0 overflow-hidden bg-blush">
                        {item.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- pre-generated thumbnail
                          <img
                            src={item.thumbUrl}
                            alt=""
                            width={48}
                            height={60}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
                        <span className="block text-xs text-muted">
                          {item.categoryName}
                          {item.stockStatus === "out_of_stock" ? ", out of stock" : ""}
                          {item.stockStatus === "preorder" ? ", preorder" : ""}
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-ink">{formatPkr(price.current)}</span>
                    </li>
                  );
                })}
              </ul>
              <Link
                href={`/search?q=${encodeURIComponent(q)}` as Route}
                onClick={close}
                className="mt-1 flex h-11 items-center px-2 text-sm font-medium text-cherry underline-offset-4 hover:underline"
              >
                See all results for “{q}”
              </Link>
            </>
          ) : q && index ? (
            <p className="px-2 py-4 text-sm text-ink-soft">
              No products match “{q}”. Try a shorter word, or browse a category below.
            </p>
          ) : null}

          {!q || (index && results.length === 0) ? (
            <nav aria-label="Browse categories" className="px-2 pt-2 pb-3">
              <p className="mb-2 text-xs font-medium text-muted">Browse</p>
              <ul className="flex flex-wrap gap-2">
                {quickLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={close}
                      className="inline-flex h-10 items-center rounded-sm border border-line px-3 text-sm text-ink hover:border-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
