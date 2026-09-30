"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { formatPkr, priceInfo } from "@/domain/money";
import { buildWhatsappUrl, isValidWhatsappNumber } from "@/domain/ordering";
import { buildSavedListMessage, decodeShareItems, encodeShareQuery, mergeSaved } from "@/domain/saved";
import type { SearchIndexItem } from "@/domain/search";
import { buttonClasses } from "@/components/ui/button";
import { HeartIcon, TrashIcon, WhatsappIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { getSavedSnapshot, getServerSavedSnapshot, setSaved, subscribeSaved } from "./saved-store";

const STOCK_TEXT = { in_stock: "In stock", preorder: "Preorder", out_of_stock: "Out of stock" } as const;

function Row({ item, action }: { item: SearchIndexItem; action: React.ReactNode }) {
  const price = priceInfo(item.pricePkr, item.salePricePkr);
  return (
    <li className="flex gap-4 border-b border-line py-4">
      <Link href={`/product/${item.slug}`} tabIndex={-1} aria-hidden="true" className="shrink-0">
        <span className="block aspect-[4/5] w-20 overflow-hidden bg-blush sm:w-24">
          {item.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- pre-generated variant, no optimizer
            <img src={item.thumbUrl} alt="" width={96} height={120} className="size-full object-cover" />
          ) : null}
        </span>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <Link
          href={`/product/${item.slug}`}
          className="text-sm leading-snug font-medium text-ink underline-offset-4 hover:underline"
        >
          {item.name}
        </Link>
        <p className="text-xs text-muted">{item.categoryName}</p>
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className={cn("font-semibold", price.original !== null ? "text-cherry" : "text-ink")}>
            {price.original !== null ? <span className="sr-only">Sale price </span> : null}
            {formatPkr(price.current)}
          </span>
          {price.original !== null ? (
            <s className="text-xs text-muted">
              <span className="sr-only">Original price </span>
              {formatPkr(price.original)}
            </s>
          ) : null}
        </p>
        <p
          className={cn(
            "text-xs font-medium",
            item.stockStatus === "in_stock" && "text-success",
            item.stockStatus === "preorder" && "text-warning",
            item.stockStatus === "out_of_stock" && "text-danger",
          )}
        >
          {STOCK_TEXT[item.stockStatus]}
        </p>
        <div className="mt-1">{action}</div>
      </div>
    </li>
  );
}

const noopSubscribe = () => () => {};

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

export function SavedView({ whatsappNumber }: { whatsappNumber: string | null }) {
  const saved = useSyncExternalStore(subscribeSaved, getSavedSnapshot, getServerSavedSnapshot);
  const [index, setIndex] = useState<SearchIndexItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Read from window.location (not useSearchParams) so the page needs no Suspense boundary.
  const search = useSyncExternalStore(
    noopSubscribe,
    () => window.location.search,
    () => "",
  );
  const sharedSlugs = useMemo(() => decodeShareItems(new URLSearchParams(search).get("items")), [search]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadIndex().then((items) => {
      if (cancelled) return;
      if (items.length === 0) setFailed(true);
      setIndex(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const bySlug = useMemo(() => new Map((index ?? []).map((i) => [i.slug, i])), [index]);
  // Products removed from the catalogue are dropped silently.
  const items = useMemo(
    () => saved.map((s) => bySlug.get(s)).filter((i): i is SearchIndexItem => Boolean(i)),
    [saved, bySlug],
  );
  const sharedItems = useMemo(
    () => sharedSlugs.map((s) => bySlug.get(s)).filter((i): i is SearchIndexItem => Boolean(i)),
    [sharedSlugs, bySlug],
  );
  const savedSet = useMemo(() => new Set(saved), [saved]);
  const allSharedSaved = sharedItems.every((i) => savedSet.has(i.slug));
  const loading = index === null;

  async function share() {
    const url = `${window.location.origin}/saved${encodeShareQuery(items.map((i) => i.slug))}`;
    setShareUrl(url);
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: "My USBA saved list", url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied");
    } catch {
      setStatus("Copy the link below");
    }
  }

  const waHref = useMemo(() => {
    if (!whatsappNumber || !isValidWhatsappNumber(whatsappNumber) || items.length === 0) return null;
    if (typeof window === "undefined") return null;
    return buildWhatsappUrl(whatsappNumber, buildSavedListMessage(items, window.location.origin));
  }, [whatsappNumber, items]);

  return (
    <div className="mt-2">
      <p className="max-w-prose text-sm text-ink-soft">
        Your list is kept on this device. Share the link to open it anywhere.
      </p>

      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>

      {sharedItems.length > 0 ? (
        <section aria-labelledby="shared-title" className="mt-6 bg-blush p-4 md:p-6">
          <h2 id="shared-title" className="text-lg font-semibold text-ink">
            Shared list
          </h2>
          <ul className="mt-2">
            {sharedItems.map((item) => (
              <Row
                key={item.slug}
                item={item}
                action={
                  savedSet.has(item.slug) ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft">
                      <HeartIcon size={14} className="fill-cherry text-cherry" /> Saved
                    </span>
                  ) : null
                }
              />
            ))}
          </ul>
          <button
            type="button"
            disabled={allSharedSaved}
            onClick={() => {
              setSaved(
                mergeSaved(
                  saved,
                  sharedSlugs.filter((s) => bySlug.has(s)),
                ),
              );
              setStatus("Shared items saved to your list");
            }}
            className={buttonClasses({ variant: "primary", className: "mt-4" })}
          >
            {allSharedSaved ? "All saved to your list" : "Save all to my list"}
          </button>
        </section>
      ) : null}

      <section aria-labelledby="mine-title" className="mt-8">
        <h2 id="mine-title" className="text-lg font-semibold text-ink">
          Your list{items.length > 0 ? ` (${items.length})` : ""}
        </h2>

        {loading ? (
          <p className="mt-4 text-sm text-muted">Loading your saved items…</p>
        ) : failed && saved.length > 0 ? (
          <p className="mt-4 text-sm text-danger">
            We couldn&rsquo;t load your saved items. Please try again.
          </p>
        ) : items.length === 0 ? (
          <div className="mt-4 max-w-md">
            <p className="text-base text-ink-soft">
              Nothing saved yet. Tap the heart on any piece to keep it here.
            </p>
            <Link href="/shop" className={buttonClasses({ variant: "primary", className: "mt-4" })}>
              Browse the shop
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-2">
              {items.map((item) => (
                <Row
                  key={item.slug}
                  item={item}
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setSaved(saved.filter((s) => s !== item.slug));
                        setStatus(`Removed ${item.name}`);
                      }}
                      className="-ms-2 inline-flex h-11 items-center gap-1.5 rounded-sm px-2text-sm font-medium text-ink-soft hover:bg-blush hover:text-ink"
                    >
                      <TrashIcon size={16} />
                      <span>
                        Remove<span className="sr-only"> {item.name}</span>
                      </span>
                    </button>
                  }
                />
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses({ variant: "whatsapp", size: "lg" })}
                >
                  <WhatsappIcon />
                  Ask about these on WhatsApp
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
              <button
                type="button"
                onClick={share}
                className={buttonClasses({ variant: "secondary", size: "lg", className: "border-control" })}
              >
                Share your list
              </button>
            </div>
            {shareUrl ? (
              <div className="mt-4 max-w-xl">
                <label htmlFor="share-url" className="text-sm font-medium text-ink">
                  Link to your list
                </label>
                <input
                  id="share-url"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="mt-1 h-11 w-full rounded-sm border border-control bg-surface px-3 text-sm text-ink"
                />
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
