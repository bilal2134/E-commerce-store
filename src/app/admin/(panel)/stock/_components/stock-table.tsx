"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { StatusMessage } from "@/components/admin/status-message";
import { StockPill, Thumb } from "@/components/admin/ui";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";
import type { StockStatus } from "@/domain/catalog";
import { LOW_STOCK_THRESHOLD, parseQuantity } from "@/domain/stock";
import type { ActionResult } from "@/domain/validation/result";
import { cn } from "@/lib/cn";
import { adjustStockAction } from "../actions";

export interface StockRowView {
  id: string;
  code: string;
  name: string;
  categoryName: string;
  isVisible: boolean;
  stockStatus: StockStatus;
  quantity: number | null;
  sizes: { label: string; quantity: number }[];
  thumbUrl: string | null;
  thumbAlt: string;
}

const keyOf = (id: string, size: string | null) => `${id}|${size ?? ""}`;

export function StockTable({ rows }: { rows: StockRowView[] }) {
  // Local counts and statuses override the server rows until fresh rows arrive.
  const [prevRows, setPrevRows] = useState(rows);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [statuses, setStatuses] = useState<Record<string, StockStatus>>({});
  if (rows !== prevRows) {
    setPrevRows(rows);
    setCounts({});
    setStatuses({});
  }
  const [message, setMessage] = useState<ActionResult | null>(null);
  // Changes run one after another so replies can't arrive out of order.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef<Record<string, number>>({});
  // Count including taps not rendered yet (two quick taps must both count).
  const live = useRef<Record<string, number>>({});

  const countFor = (row: StockRowView, size: string | null) =>
    counts[keyOf(row.id, size)] ??
    (size === null ? (row.quantity ?? 0) : (row.sizes.find((s) => s.label === size)?.quantity ?? 0));

  function adjust(row: StockRowView, size: string | null, delta: number) {
    const key = keyOf(row.id, size);
    const before = live.current[key] ?? countFor(row, size);
    const next = Math.max(0, before + delta);
    if (next === before) return;
    live.current[key] = next;
    setCounts((c) => ({ ...c, [key]: next }));
    pending.current[key] = (pending.current[key] ?? 0) + 1;
    const where = size ? `${row.name}, size ${size}` : row.name;
    queue.current = queue.current.then(async () => {
      const result = await adjustStockAction({ productId: row.id, size, delta: next - before });
      pending.current[key] = (pending.current[key] ?? 1) - 1;
      if (result.ok) {
        if (pending.current[key] === 0) {
          delete live.current[key];
          setCounts((c) => ({ ...c, [key]: result.quantity }));
        }
        setStatuses((s) => ({ ...s, [row.id]: result.status }));
        setMessage({ ok: true, message: `${where}: ${result.quantity} in stock` });
      } else {
        delete live.current[key];
        setCounts((c) => ({ ...c, [key]: before }));
        setMessage({ ok: false, formError: result.error });
      }
    });
  }

  if (rows.length === 0) return null;

  return (
    <div>
      <StatusMessage result={message} className="mb-3" />
      <ul className="divide-y divide-line rounded-sm border border-line bg-surface">
        {rows.map((row) => {
          const status = statuses[row.id] ?? row.stockStatus;
          const sized = row.sizes.length > 0;
          const total = sized
            ? row.sizes.reduce((sum, s) => sum + countFor(row, s.label), 0)
            : countFor(row, null);
          return (
            <li key={row.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
              <div className="flex min-w-0 items-center gap-3 lg:w-80 lg:shrink-0">
                <Thumb src={row.thumbUrl} alt={row.thumbAlt} className="h-14 w-11 shrink-0 rounded-xs" />
                <div className="min-w-0">
                  <Link
                    href={`/admin/products/${row.id}`}
                    className="font-medium hover:text-cherry hover:underline"
                  >
                    {row.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {row.code} · {row.categoryName}
                    {row.isVisible ? "" : " · Hidden"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StockPill status={status} />
                    {row.quantity !== null ? (
                      <span className="text-xs text-ink-soft tabular-nums">
                        {total} {sized ? "pairs in total" : "in stock"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {row.quantity === null ? (
                <p className="text-sm text-ink-soft">
                  Not counted.{" "}
                  <Link
                    href={`/admin/products/${row.id}`}
                    className="font-medium text-cherry underline-offset-4 hover:underline"
                  >
                    Turn on “Count stock”<span className="sr-only"> for {row.name}</span>
                  </Link>{" "}
                  to track quantities.
                </p>
              ) : sized ? (
                <ul className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                  {row.sizes.map((s) => (
                    <li key={s.label}>
                      <Stepper
                        label={`Size ${s.label}`}
                        context={row.name}
                        value={countFor(row, s.label)}
                        onAdjust={(delta) => adjust(row, s.label, delta)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="w-44">
                  <Stepper
                    label="In stock"
                    context={row.name}
                    value={countFor(row, null)}
                    onAdjust={(delta) => adjust(row, null, delta)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** −  [count]  +  with a typed count applied on Enter or when leaving the field. */
function Stepper({
  label,
  context,
  value,
  onAdjust,
}: {
  label: string;
  context: string;
  value: number;
  onAdjust: (delta: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const low = value <= LOW_STOCK_THRESHOLD;
  const commit = () => {
    if (draft === null) return;
    const typed = parseQuantity(draft);
    setDraft(null);
    if (typed !== null && typed !== value) onAdjust(typed - value);
  };
  const button =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-sm border border-line-strong text-ink hover:border-ink hover:bg-blush disabled:cursor-not-allowed disabled:opacity-40 md:size-9";
  return (
    <div>
      <p
        className={cn(
          "mb-1 text-xs font-medium",
          value === 0 ? "text-danger" : low ? "text-warning" : "text-ink-soft",
        )}
      >
        {label}
        {value === 0 ? " · sold out" : low ? " · low" : ""}
      </p>
      <div role="group" aria-label={`${label}, ${context}`} className="flex items-center gap-1">
        <button
          type="button"
          className={button}
          disabled={value === 0}
          onClick={() => onAdjust(-1)}
          aria-label={`Remove one: ${label}, ${context}`}
        >
          <MinusIcon size={16} />
        </button>
        <input
          inputMode="numeric"
          aria-label={`Count: ${label}, ${context}`}
          value={draft ?? String(value)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setDraft(null);
            }
          }}
          className="h-11 w-14 rounded-sm border border-control bg-surface text-center text-sm font-medium tabular-nums md:h-9"
        />
        <button
          type="button"
          className={button}
          onClick={() => onAdjust(1)}
          aria-label={`Add one: ${label}, ${context}`}
        >
          <PlusIcon size={16} />
        </button>
      </div>
    </div>
  );
}
