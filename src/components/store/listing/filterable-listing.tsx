"use client";

import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { COLOR_LABELS, COLOR_SWATCHES, type Color } from "@/domain/catalog";
import {
  activeFilterCount,
  applyFilters,
  DEFAULT_FILTERS,
  parseFilters,
  PRICE_BANDS,
  serializeFilters,
  SORT_LABELS,
  SORT_OPTIONS,
  type Listable,
  type ListingFilters,
  type SortOption,
} from "@/domain/listing";
import { formatPkr } from "@/domain/money";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { CheckIcon, CloseIcon, FilterIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
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
}: {
  items: Listable[];
  cards: Record<string, ReactNode>;
  colors: { color: Color; count: number }[];
  label: string;
}) {
  const search = useUrlSearch();
  const filters = useMemo(() => parseFilters(new URLSearchParams(search)), [search]);
  const visible = useMemo(() => applyFilters(items, filters), [items, filters]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [side, setSide] = useState<"bottom" | "right">("bottom");
  const resultsRef = useRef<HTMLParagraphElement>(null);
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
      label: COLOR_LABELS[c],
      next: { ...filters, colors: filters.colors.filter((x) => x !== c) },
    })),
    ...(filters.minPrice !== null || filters.maxPrice !== null
      ? [
          {
            key: "price",
            label: priceLabel(filters.minPrice, filters.maxPrice),
            next: { ...filters, minPrice: null, maxPrice: null },
          },
        ]
      : []),
    ...(filters.inStockOnly
      ? [{ key: "stock", label: "In stock only", next: { ...filters, inStockOnly: false } }]
      : []),
  ];

  return (
    <div>
      <div className="sticky top-[var(--header-height)] z-30 -mx-4 border-b border-line bg-petal/95 px-4 py-2 backdrop-blur-sm md:-mx-6 md:px-6 lg:mx-0 lg:px-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openSheet}
            aria-haspopup="dialog"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:border-ink"
          >
            <FilterIcon size={18} />
            Filter
            {activeCount ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-xs bg-cherry px-1 text-xs text-white">
                {activeCount}
                <span className="sr-only"> active</span>
              </span>
            ) : null}
          </button>

          <ul
            aria-label="Active filters"
            className={cn(
              "scroller flex min-w-0 flex-1 gap-2 overflow-x-auto",
              chips.length === 0 && "hidden",
            )}
          >
            {chips.map((chip) => (
              <li key={chip.key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => apply(chip.next)}
                  className="inline-flex h-9 items-center gap-1 rounded-sm bg-ballet px-3 text-sm text-ink hover:bg-ballet/70"
                >
                  {chip.label}
                  <CloseIcon size={14} aria-hidden="true" />
                  <span className="sr-only">(remove filter)</span>
                </button>
              </li>
            ))}
            <li className="shrink-0">
              <button
                type="button"
                onClick={() => apply({ ...DEFAULT_FILTERS, sort: filters.sort })}
                className="inline-flex h-9 items-center px-2 text-sm font-medium text-cherry underline underline-offset-4"
              >
                Clear all
              </button>
            </li>
          </ul>
          <div className={cn("flex-1", chips.length > 0 && "hidden")} />

          <SortSelect value={filters.sort} onChange={(sort) => apply({ ...filters, sort })} />
        </div>
      </div>

      <p ref={resultsRef} className="mt-4 mb-4 text-sm text-ink-soft" role="status" aria-live="polite">
        {visible.length === items.length
          ? `${items.length} ${items.length === 1 ? "product" : "products"}`
          : `Showing ${visible.length} of ${items.length} products`}
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
          <p className="type-title text-2xl">No products match these filters</p>
          <p className="mt-2 text-sm text-ink-soft">
            Remove a filter or clear them all to see everything here.
          </p>
          <Button className="mt-5" variant="secondary" onClick={() => apply(DEFAULT_FILTERS)}>
            Clear filters
          </Button>
        </div>
      )}

      <FilterSheet
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

function priceLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${formatPkr(min)} – ${formatPkr(max)}`;
  if (min !== null) return `${formatPkr(min)}+`;
  if (max !== null) return `Up to ${formatPkr(max)}`;
  return "Any price";
}

function SortSelect({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  const id = useId();
  return (
    <div className="flex shrink-0 items-center gap-2">
      <label htmlFor={id} className="hidden text-sm text-ink-soft sm:block">
        Sort
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="h-11 max-w-40 appearance-none rounded-sm border border-line-strong bg-surface ps-3 pe-8 text-sm text-ink hover:border-ink sm:max-w-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5' fill='none' stroke='%235c4652' stroke-width='1.6'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.7rem center",
          backgroundSize: "11px",
        }}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o} value={o}>
            {SORT_LABELS[o]}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterSheet({
  open,
  side,
  onClose,
  filters,
  items,
  colors,
  onApply,
}: {
  open: boolean;
  side: "bottom" | "right";
  onClose: () => void;
  filters: ListingFilters;
  items: Listable[];
  colors: { color: Color; count: number }[];
  onApply: (f: ListingFilters) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Filter and sort" side={side}>
      {/* Mounted only while open, so the draft always starts from the applied filters. */}
      {open ? <FilterForm filters={filters} items={items} colors={colors} onApply={onApply} /> : null}
    </Sheet>
  );
}

function FilterForm({
  filters,
  items,
  colors,
  onApply,
}: {
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
          <legend className="mb-3 text-sm font-semibold">Sort by</legend>
          <div className="grid gap-1">
            {SORT_OPTIONS.map((o) => (
              <label key={o} className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="radio"
                  name={`${ids}-sort`}
                  checked={draft.sort === o}
                  onChange={() => setDraft((d) => ({ ...d, sort: o }))}
                  className="size-5 accent-cherry"
                />
                {SORT_LABELS[o]}
              </label>
            ))}
          </div>
        </fieldset>

        {colors.length ? (
          <fieldset className="py-5">
            <legend className="mb-3 text-sm font-semibold">Colour</legend>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
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
                      {COLOR_LABELS[color]} <span className="text-muted">({n})</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <fieldset className="py-5">
          <legend className="mb-3 text-sm font-semibold">Price</legend>
          <div className="flex flex-wrap gap-2">
            {PRICE_BANDS.map((b) => {
              const selected = draft.minPrice === b.min && draft.maxPrice === b.max;
              return (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => (selected ? setPrice(null, null) : setPrice(b.min, b.max))}
                  className="inline-flex h-10 items-center rounded-sm border border-line-strong px-3 text-sm aria-pressed:border-cherry aria-pressed:bg-cherry-tint aria-pressed:text-cherry-deep"
                >
                  {b.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(
              [
                ["min", "Min (Rs.)", minInput, setMinInput],
                ["max", "Max (Rs.)", maxInput, setMaxInput],
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
                  className="mt-1 h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-base"
                />
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="py-5">
          <legend className="sr-only">Availability</legend>
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold">
            Hide out-of-stock items
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
          Clear all
        </Button>
        <Button className="flex-1" onClick={() => onApply(draft)} disabled={count === 0}>
          {count === 0 ? "No matching products" : `Show ${count} ${count === 1 ? "result" : "results"}`}
        </Button>
      </div>
    </div>
  );
}
