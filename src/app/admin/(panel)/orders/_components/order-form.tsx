"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Panel } from "@/components/admin/ui";
import { StatusMessage } from "@/components/admin/status-message";
import { useActionForm } from "@/components/admin/use-action-form";
import { formatPkr } from "@/domain/money";
import { ORDER_CHANNEL_LABELS, ORDER_CHANNELS, ORDER_STATUS_LABELS, ORDER_STATUSES } from "@/domain/orders";
import { fieldErrorsFrom, parseRupees } from "@/domain/validation/common";
import { manualOrderSchema, type ManualOrderValues } from "@/domain/validation/order";
import { createManualOrderAction } from "../actions";

interface ProductOption {
  id: string;
  code: string;
  name: string;
  currentPrice: number;
  sizes: string[];
  /** Units left; null when stock isn't counted. */
  stockLeft: number | null;
  sizeStockLeft: Record<string, number> | null;
}

const leftLabel = (n: number | undefined | null) =>
  n === undefined || n === null ? "" : n === 0 ? " · sold out" : ` · ${n} left`;

export function OrderForm({ products }: { products: ProductOption[] }) {
  const searchId = useId();
  const [v, setV] = useState<ManualOrderValues>({
    customerName: "",
    customerPhone: "",
    productId: "",
    size: "",
    quantity: "1",
    unitPrice: "",
    status: "received",
    channel: "whatsapp",
    notes: "",
  });
  const [search, setSearch] = useState("");
  const [priceEdited, setPriceEdited] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const { state, pending, onSubmit, fieldErrors: serverErrors } = useActionForm(createManualOrderAction);
  const [seenState, setSeenState] = useState(state);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  if (state !== seenState) {
    setSeenState(state);
    setDismissed({});
  }

  const product = products.find((p) => p.id === v.productId);
  const needsSize = (product?.sizes.length ?? 0) > 0;
  const needle = search.trim().toLowerCase();
  const matches = products.filter(
    (p) => needle === "" || p.name.toLowerCase().includes(needle) || p.code.toLowerCase().includes(needle),
  );

  const parsed = manualOrderSchema.safeParse(v);
  const clientErrors: Record<string, string> = parsed.success ? {} : fieldErrorsFrom(parsed.error);
  if (needsSize && v.size === "") clientErrors.size = "Choose a size for this product";
  const error = (f: string) => {
    const c = clientErrors[f];
    if (c && (touched[f] || attempted)) return c;
    if (!c && !dismissed[f]) return serverErrors[f];
    return undefined;
  };
  const set = <K extends keyof ManualOrderValues>(k: K, value: ManualOrderValues[K]) => {
    setV((p) => ({ ...p, [k]: value }));
    setDismissed((d) => ({ ...d, [k]: true }));
  };
  const touch = (f: string) => () => setTouched((t) => ({ ...t, [f]: true }));

  function chooseProduct(id: string) {
    const p = products.find((x) => x.id === id);
    setV((prev) => ({
      ...prev,
      productId: id,
      size: p && p.sizes.includes(prev.size) ? prev.size : "",
      unitPrice: priceEdited || !p ? prev.unitPrice : String(p.currentPrice),
    }));
    setDismissed((d) => ({ ...d, productId: true, size: true }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    setAttempted(true);
    if (!parsed.success || (needsSize && v.size === "")) {
      e.preventDefault();
      const form = e.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    onSubmit(e);
  }

  const unit = v.unitPrice.trim() === "0" ? 0 : parseRupees(v.unitPrice);
  const qty = Number(v.quantity);
  const total = unit !== null && Number.isInteger(qty) && qty > 0 ? unit * qty : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6" aria-label="New manual order">
      <Panel title="Customer">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="customerName" label="Customer name" required error={error("customerName")}>
            {(aria) => (
              <Input
                {...aria}
                name="customerName"
                value={v.customerName}
                autoComplete="off"
                onBlur={touch("customerName")}
                onChange={(e) => set("customerName", e.target.value)}
              />
            )}
          </Field>
          <Field id="customerPhone" label="Phone number" required error={error("customerPhone")}>
            {(aria) => (
              <Input
                {...aria}
                name="customerPhone"
                type="tel"
                value={v.customerPhone}
                autoComplete="off"
                onBlur={touch("customerPhone")}
                onChange={(e) => set("customerPhone", e.target.value)}
              />
            )}
          </Field>
          <Field id="channel" label="Order channel">
            {(aria) => (
              <Select
                {...aria}
                name="channel"
                value={v.channel}
                onChange={(e) => set("channel", e.target.value as typeof v.channel)}
              >
                {ORDER_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {ORDER_CHANNEL_LABELS[c]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="status" label="Status">
            {(aria) => (
              <Select
                {...aria}
                name="status"
                value={v.status}
                onChange={(e) => set("status", e.target.value as typeof v.status)}
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Panel>

      <Panel title="Product">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={searchId} className="block text-sm font-medium">
              Search products
            </label>
            <Input
              id={searchId}
              type="search"
              className="mt-1.5"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type a name or code, for example USBA-004"
              autoComplete="off"
            />
          </div>
          <Field
            id="productId"
            label="Product"
            required
            error={error("productId")}
            className="sm:col-span-2"
            hint={`${matches.length} of ${products.length} products`}
          >
            {(aria) => (
              <Select
                {...aria}
                name="productId"
                size={6}
                value={v.productId}
                onBlur={touch("productId")}
                onChange={(e) => chooseProduct(e.target.value)}
                className="h-auto! bg-none pr-3"
              >
                {matches.map((p) => (
                  <option key={p.id} value={p.id} className="min-h-9 py-1.5">
                    {p.name} ({p.code}) · {formatPkr(p.currentPrice)}
                    {p.sizeStockLeft ? "" : leftLabel(p.stockLeft)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {needsSize ? (
            <Field id="size" label="Size" required error={error("size")}>
              {(aria) => (
                <Select
                  {...aria}
                  name="size"
                  value={v.size}
                  onBlur={touch("size")}
                  onChange={(e) => set("size", e.target.value)}
                >
                  <option value="">Choose a size</option>
                  {product?.sizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                      {leftLabel(product.sizeStockLeft?.[s])}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
          <Field id="quantity" label="Quantity" required error={error("quantity")}>
            {(aria) => (
              <Input
                {...aria}
                name="quantity"
                inputMode="numeric"
                value={v.quantity}
                onBlur={touch("quantity")}
                onChange={(e) => set("quantity", e.target.value)}
              />
            )}
          </Field>
          <Field
            id="unitPrice"
            label="Unit price (Rs.)"
            required
            error={error("unitPrice")}
            hint={
              product ? (
                <>Current price is {formatPkr(product.currentPrice)}. Change it for discounts.</>
              ) : (
                "Filled in from the product; you can change it."
              )
            }
          >
            {(aria) => (
              <Input
                {...aria}
                name="unitPrice"
                inputMode="numeric"
                value={v.unitPrice}
                onBlur={touch("unitPrice")}
                onChange={(e) => {
                  setPriceEdited(true);
                  set("unitPrice", e.target.value);
                }}
              />
            )}
          </Field>
          <div className="flex items-end pb-2 text-sm text-ink-soft">
            {total !== null ? (
              <p>
                Order total: <span className="font-semibold text-ink tabular-nums">{formatPkr(total)}</span>
              </p>
            ) : null}
          </div>
        </div>
      </Panel>

      <Panel title="Notes">
        <Field
          id="notes"
          label="Notes (optional)"
          error={error("notes")}
          hint="Address, delivery city or anything to remember."
        >
          {(aria) => (
            <Textarea
              {...aria}
              name="notes"
              rows={3}
              value={v.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          )}
        </Field>
      </Panel>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:flex-1">
          <StatusMessage result={state} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/orders"
            className="inline-flex h-11 items-center rounded-sm px-4 text-sm font-medium text-ink-soft hover:bg-blush"
          >
            Cancel
          </Link>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save order"}
          </Button>
        </div>
      </div>
    </form>
  );
}
