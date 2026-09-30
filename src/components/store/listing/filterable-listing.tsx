"use client";

import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { COLOR_SWATCHES, type Color } from "@/domain/catalog";
import {
  activeFilterCount,
  applyFilters,
  DEFAULT_FILTERS,
  parseFilters,
  PRICE_BANDS,
  serializeFilters,
  SORT_OPTIONS,
  type Listable,
  type ListingFilters,
  type SortOption,
} from "@/domain/listing";
import { formatPkr } from "@/domain/money";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { CheckIcon, CloseIcon, FilterIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import type { Locale } from "@/i18n/config";
import { dictionaryFor, type Dictionary } from "@/i18n/dictionaries";
import { pushUrlSearch, useUrlSearch } from "./use-url-search";

/**
 * Client-side filtering over a server-rendered listing (ADR-0007). Cards are
 * rendered on the server and passed in by id, so they never hydrate; this
 * component only reorders and hides them.
 */
export function FilterableListing({
  items,
  cards,
  colors,
  label,
  locale,
}: {
  items: Listable[];
  cards: Record<string, ReactNode>;
  colors: { color: Color; count: number }[];
  label: string;
  locale: Locale;
}) {
  const t = dictionaryFor(locale);
  const search = useUrlSearch();
  const filters = useMemo(() => parseFilters(new URLSearchParams(search)), [search]);
  const visible = useMemo(() => applyFilters(items, filters), [items, filters]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [side, setSide] = useState<"bottom" | "right">("bottom");
  const resultsRef = useRef<HTMLParagraphElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const activeCount = activeFilterCount(filters);

  function apply(next: ListingFilters) {
    pushUrlSearch(serializeFilters(next));
    track("filter_change", { filters: serializeFilters(next).slice(0, 100) || "none" });
  }

  function openSheet() {
    setSide(window.matchMedia("(min-width: 48rem)").matches ? "right" : "bottom");
    setSheetOpen(true);
  }

  const chips: { key: string; label: string; next: ListingFilters }[] = [
    ...filters.colors.map((c) => ({
      key: `c-${c}`,
      label: t.colors[c],
      next: { ...filters, colors: filters.colors.filter((x) => x !== c) },
    })),
    ...(filters.minPrice !== null || filters.maxPrice !== null
      ? [
          {
            key: "price",
            label: priceLabel(filters.minPrice, filters.maxPrice, t),
            next: { ...filters, minPrice: null, maxPrice: null },
          },
        ]
      : []),
    ...(filters.inStockOnly
      ? [{ key: "stock", label: t.listing.inStockOnly, next: { ...filters, inStockOnly: false } }]
      : []),
  ];

  return (
    <div>
      <div className="sticky top-[var(--header-height)] z-30 -mx-4 border-b border-line bg-petal/95 px-4 py-2 backdrop-blur-sm md:-mx-6 md:px-6 lg:mx-0 lg:px-0">
        <div className="flex items-center justify-between gap-2">
          <button
            ref={filterButtonRef}
            type="button"
            onClick={openSheet}
            aria-haspopup="dialog"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm border border-control bg-surface px-4 text-sm font-medium text-ink hover:border-ink"
          >
            <FilterIcon size={18} />
            {t.listing.filter}
            {activeCount ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-xs bg-cherry px-1 text-xs text-white">
                {activeCount}
                <span className="sr-only"> {t.listing.active}</span>
              </span>
            ) : null}
          </button>
          <SortSelect t={t} value={filters.sort} onChange={(sort) => apply({ ...filters, sort })} />
        </div>

        {/* Active filters get their own wrapping row so they stay usable at 320px. */}
        {chips.length ? (
          <ul aria-label={t.listing.activeFilters} className="mt-2 flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  onClick={() => {
                    apply(chip.next);
                    // The chip unmounts; keep keyboard focus somewhere sensible.
                    filterButtonRef.current?.focus();
                  }}
                  className="inline-flex h-10 items-center gap-1 rounded-sm bg-ballet px-3 text-sm text-ink hover:bg-ballet/70"
                >
                  {chip.label}
                  <CloseIcon size={14} aria-hidden="true" />
                  <span className="sr-only">{t.listing.removeFilter}</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => {
                  apply({ ...DEFAULT_FILTERS, sort: filters.sort });
                  filterButtonRef.current?.focus();
                }}
                className="inline-flex h-10 items-center px-2 text-sm font-medium text-cherry underline underline-offset-4"
              >
                {t.listing.clearAll}
              </button>
            </li>
          </ul>
        ) : null}
      </div>

      <p ref={resultsRef} className="mt-4 mb-4 text-sm text-ink-soft" role="status" aria-live="polite">
        {visible.length === items.length
          ? t.listing.count(items.length)
          : t.listing.showing(visible.length, items.length)}
      </p>

      {visible.length ? (
        <ul
          aria-label={label}
          className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-10"
        >
          {visible.map((item) => (
            <li key={item.id}>{cards[item.id]}</li>
          ))}
        </ul>
      ) : (
        <div className="border border-dashed border-line-strong px-6 py-14 text-center">
          <p className="type-title text-2xl">{t.listing.noMatchTitle}</p>
          <p className="mt-2 text-sm text-ink-soft">{t.listing.noMatchBody}</p>
          <Button className="mt-5" variant="secondary" onClick={() => apply(DEFAULT_FILTERS)}>
            {t.listing.clearFilters}
          </Button>
        </div>
      )}

      <FilterSheet
        t={t}
        open={sheetOpen}
        side={side}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        items={items}
        colors={colors}
        onApply={(next) => {
          apply(next);
          setSheetOpen(false);
          resultsRef.current?.scrollIntoView({ block: "nearest" });
        }}
      />
    </div>
  );
}

function priceLabel(min: number | null, max: number | null, t: Dictionary): string {
  if (min !== null && max !== null) return `${formatPkr(min)} – ${formatPkr(max)}`;
  if (min !== null) return `${formatPkr(min)}+`;
  if (max !== null) return t.listing.upTo(formatPkr(max));
  return t.listing.anyPrice;
}

function SortSelect({
  t,
  value,
  onChange,
}: {
  t: Dictionary;
  value: SortOption;
  onChange: (v: SortOption) => void;
}) {
  const id = useId();
  return (
    <div className="flex shrink-0 items-center gap-2">
      <label htmlFor={id} className="sr-only text-sm text-ink-soft sm:not-sr-only">
        {t.listing.sort}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="h-11 max-w-40 appearance-none rounded-sm border border-control bg-surface ps-3 pe-8 text-sm text-ink hover:border-ink sm:max-w-none"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o} value={o}>
            {t.listing.sortLabels[o]}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterSheet({
  t,
  open,
  side,
  onClose,
  filters,
  items,
  colors,
  onApply,
}: {
  t: Dictionary;
  open: boolean;
  side: "bottom" | "right";
  onClose: () => void;
  filters: ListingFilters;
  items: Listable[];
  colors: { color: Color; count: number }[];
  onApply: (f: ListingFilters) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={t.listing.sheetTitle} side={side} closeLabel={t.common.close}>
      {/* Mounted only while open, so the draft always starts from the applied filters. */}
      {open ? <FilterForm t={t} filters={filters} items={items} colors={colors} onApply={onApply} /> : null}
    </Sheet>
  );
}

function FilterForm({
  t,
  filters,
  items,
  colors,
  onApply,
}: {
  t: Dictionary;
  filters: ListingFilters;
  items: Listable[];
  colors: { color: Color; count: number }[];
  onApply: (f: ListingFilters) => void;
}) {
  // Draft state: changes apply only on "Show N results" (Baymard mobile pattern).
  const [draft, setDraft] = useState(filters);
  const [minInput, setMinInput] = useState(filters.minPrice?.toString() ?? "");
  const [maxInput, setMaxInput] = useState(filters.maxPrice?.toString() ?? "");
  const count = useMemo(() => applyFilters(items, draft).length, [items, draft]);
  const ids = useId();

  const setPrice = (min: number | null, max: number | null) => {
    setDraft((d) => ({ ...d, minPrice: min, maxPrice: max }));
    setMinInput(min?.toString() ?? "");
    setMaxInput(max?.toString() ?? "");
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 divide-y divide-line px-5">
        <fieldset className="py-5 md:hidden">
          <legend className="float-left mb-3 w-full text-sm font-semibold">{t.listing.sortBy}</legend>
          <div className="clear-left grid gap-1">
            {SORT_OPTIONS.map((o) => (
              <label key={o} className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="radio"
                  name={`${ids}-sort`}
                  checked={draft.sort === o}
                  onChange={() => setDraft((d) => ({ ...d, sort: o }))}
                  className="size-5 accent-cherry"
                />
                {t.listing.sortLabels[o]}
              </label>
            ))}
          </div>
        </fieldset>

        {colors.length ? (
          <fieldset className="py-5">
            <legend className="float-left mb-3 w-full text-sm font-semibold">{t.listing.colour}</legend>
            <div className="clear-left grid grid-cols-2 gap-x-3 gap-y-1">
              {colors.map(({ color, count: n }) => {
                const checked = draft.colors.includes(color);
                return (
                  <label key={color} className="flex min-h-11 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={checked}
                      onChange={() =>
                        setDraft((d) => ({
                          ...d,
                          colors: checked ? d.colors.filter((c) => c !== color) : [...d.colors, color],
                        }))
                      }
                    />
                    <span
                      aria-hidden="true"
                      className="relative inline-flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ring-line-strong peer-checked:ring-2 peer-checked:ring-cherry peer-checked:ring-offset-2 peer-checked:ring-offset-surface peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-cherry"
                      style={{ background: COLOR_SWATCHES[color] }}
                    >
                      {checked ? (
                        <CheckIcon
                          size={14}
                          className={
                            ["white", "cream", "yellow", "silver", "gold", "pink"].includes(color)
                              ? "text-ink"
                              : "text-white"
                          }
                        />
                      ) : null}
                    </span>
                    <span>
                      {t.colors[color]} <span className="text-muted">({n})</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <fieldset className="py-5">
          <legend className="float-left mb-3 w-full text-sm font-semibold">{t.listing.price}</legend>
          <div className="clear-left flex flex-wrap gap-2">
            {PRICE_BANDS.map((b) => {
              const selected = draft.minPrice === b.min && draft.maxPrice === b.max;
              return (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => (selected ? setPrice(null, null) : setPrice(b.min, b.max))}
                  className="inline-flex h-10 items-center rounded-sm border border-control px-3 text-sm aria-pressed:border-cherry aria-pressed:bg-cherry-tint aria-pressed:text-cherry-deep"
                >
                  {t.listing.priceBands[b.id]}
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(
              [
                ["min", t.listing.min, minInput, setMinInput],
                ["max", t.listing.max, maxInput, setMaxInput],
              ] as const
            ).map(([key, lbl, value, setValue]) => (
              <div key={key}>
                <label htmlFor={`${ids}-${key}`} className="text-xs text-ink-soft">
                  {lbl}
                </label>
                <input
                  id={`${ids}-${key}`}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={value}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setValue(v);
                    setDraft((d) => ({
                      ...d,
                      [key === "min" ? "minPrice" : "maxPrice"]: v ? Number(v) : null,
                    }));
                  }}
                  className="mt-1 h-11 w-full rounded-sm border border-control bg-surface px-3 text-base"
                />
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="py-5">
          <legend className="sr-only">{t.listing.availability}</legend>
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold">
            {t.listing.hideOutOfStock}
            <input
              type="checkbox"
              checked={draft.inStockOnly}
              onChange={(e) => setDraft((d) => ({ ...d, inStockOnly: e.target.checked }))}
              className="size-5 accent-cherry"
            />
          </label>
        </fieldset>
      </div>
      <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-surface px-5 py-3">
        <Button
          variant="ghost"
          onClick={() => {
            setPrice(null, null);
            setDraft({ ...DEFAULT_FILTERS, sort: draft.sort });
          }}
        >
          {t.listing.clearAll}
        </Button>
        <Button className="flex-1" onClick={() => onApply(draft)} disabled={count === 0}>
          {count === 0 ? t.listing.noMatchingProducts : t.listing.showResults(count)}
        </Button>
      </div>
    </div>
  );
}
