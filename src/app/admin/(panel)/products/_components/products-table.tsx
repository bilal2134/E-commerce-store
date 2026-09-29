"use client";

import Link from "next/link";
import { useState } from "react";
import { Select } from "@/components/ui/field";
import { EditIcon, TrashIcon } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { StatusMessage } from "@/components/admin/status-message";
import { Thumb } from "@/components/admin/ui";
import { STOCK_STATUS_LABELS, STOCK_STATUSES, type StockStatus } from "@/domain/catalog";
import { formatPkr } from "@/domain/money";
import type { ActionResult } from "@/domain/validation/result";
import { buttonClasses } from "@/components/ui/button";
import { deleteProductAction, setProductStockAction, setProductVisibilityAction } from "../actions";

export interface ProductRowView {
  id: string;
  code: string;
  name: string;
  categoryName: string;
  pricePkr: number;
  salePricePkr: number | null;
  stockStatus: StockStatus;
  badge: string | null;
  isVisible: boolean;
  featured: boolean;
  imageCount: number;
  thumbUrl: string | null;
  thumbAlt: string;
}

type Patch = Partial<Pick<ProductRowView, "isVisible" | "stockStatus">>;

export function ProductsTable({ rows }: { rows: ProductRowView[] }) {
  // Optimistic overrides live until the server sends fresh rows.
  const [prevRows, setPrevRows] = useState(rows);
  const [patches, setPatches] = useState<Record<string, Patch>>({});
  if (rows !== prevRows) {
    setPrevRows(rows);
    setPatches({});
  }

  const [message, setMessage] = useState<ActionResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ProductRowView | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const view = rows.map((r) => ({ ...r, ...patches[r.id] }));

  async function toggleVisible(row: ProductRowView, next: boolean) {
    setBusyId(row.id);
    setPatches((p) => ({ ...p, [row.id]: { ...p[row.id], isVisible: next } }));
    const result = await setProductVisibilityAction(row.id, next);
    if (!result.ok) setPatches((p) => ({ ...p, [row.id]: { ...p[row.id], isVisible: !next } }));
    setMessage(result);
    setBusyId(null);
  }

  async function changeStock(row: ProductRowView, next: StockStatus) {
    setBusyId(row.id);
    const before = row.stockStatus;
    setPatches((p) => ({ ...p, [row.id]: { ...p[row.id], stockStatus: next } }));
    const result = await setProductStockAction(row.id, next);
    if (!result.ok) setPatches((p) => ({ ...p, [row.id]: { ...p[row.id], stockStatus: before } }));
    setMessage(result);
    setBusyId(null);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusyId(toDelete.id);
    setDeleteError(null);
    const result = await deleteProductAction(toDelete.id);
    setBusyId(null);
    if (result.ok) {
      setToDelete(null);
      setMessage({ ok: true, message: `Deleted “${toDelete.name}”` });
    } else {
      setDeleteError(result.formError ?? "Could not delete this product.");
    }
  }

  const price = (row: ProductRowView) =>
    row.salePricePkr !== null ? (
      <span className="tabular-nums">
        <span className="font-medium">{formatPkr(row.salePricePkr)}</span>{" "}
        <span className="text-muted line-through">{formatPkr(row.pricePkr)}</span>
      </span>
    ) : (
      <span className="font-medium tabular-nums">{formatPkr(row.pricePkr)}</span>
    );

  const actions = (row: ProductRowView) => (
    <div className="flex items-center gap-1">
      <Link
        href={`/admin/products/${row.id}`}
        className={buttonClasses({ variant: "secondary", size: "sm", className: "h-11 md:h-9" })}
      >
        <EditIcon size={16} />
        Edit<span className="sr-only"> {row.name}</span>
      </Link>
      <button
        type="button"
        onClick={() => {
          setDeleteError(null);
          setToDelete(row);
        }}
        className={buttonClasses({ variant: "ghost", size: "sm", className: "h-11 text-danger md:h-9" })}
      >
        <TrashIcon size={16} />
        Delete<span className="sr-only"> {row.name}</span>
      </button>
    </div>
  );

  return (
    <div>
      <StatusMessage result={message} className="mb-3" />

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-sm border border-line bg-surface md:block">
        <table className="w-full min-w-[56rem] text-sm">
          <caption className="sr-only">Products</caption>
          <thead>
            <tr className="border-b border-line text-start text-muted">
              <th scope="col" className="sticky top-0 bg-surface px-4 py-3 text-start font-medium">
                Product
              </th>
              <th scope="col" className="sticky top-0 bg-surface px-3 py-3 text-start font-medium">
                Price
              </th>
              <th scope="col" className="sticky top-0 bg-surface px-3 py-3 text-start font-medium">
                Stock
              </th>
              <th scope="col" className="sticky top-0 bg-surface px-3 py-3 text-start font-medium">
                Visible
              </th>
              <th scope="col" className="sticky top-0 bg-surface px-4 py-3 text-end font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {view.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
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
                        {row.badge ? ` · ${row.badge}` : ""}
                        {row.featured ? " · Featured" : ""}
                      </p>
                      {row.imageCount < 2 ? (
                        <p className="text-xs font-medium text-warning">
                          Needs at least 2 images to be shown
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">{price(row)}</td>
                <td className="px-3 py-3">
                  <Select
                    aria-label={`Stock status for ${row.name}`}
                    value={row.stockStatus}
                    disabled={busyId === row.id}
                    onChange={(e) => changeStock(row, e.target.value as StockStatus)}
                    className="min-w-36"
                  >
                    {STOCK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STOCK_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-3 py-3">
                  <Switch
                    checked={row.isVisible}
                    disabled={busyId === row.id}
                    onCheckedChange={(next) => toggleVisible(row, next)}
                    aria-label={`Visible on site: ${row.name}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">{actions(row)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-3 md:hidden">
        {view.map((row) => (
          <li key={row.id} className="rounded-sm border border-line bg-surface p-3">
            <div className="flex gap-3">
              <Thumb src={row.thumbUrl} alt={row.thumbAlt} className="h-20 w-16 shrink-0 rounded-xs" />
              <div className="min-w-0 flex-1">
                <Link href={`/admin/products/${row.id}`} className="font-medium hover:text-cherry">
                  {row.name}
                </Link>
                <p className="text-xs text-muted">
                  {row.code} · {row.categoryName}
                </p>
                <p className="mt-1 text-sm">{price(row)}</p>
                {row.imageCount < 2 ? (
                  <p className="text-xs font-medium text-warning">Needs at least 2 images to be shown</p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
              <label className="flex items-center gap-1 text-sm">
                <span className="text-ink-soft">Visible</span>
                <Switch
                  checked={row.isVisible}
                  disabled={busyId === row.id}
                  onCheckedChange={(next) => toggleVisible(row, next)}
                  aria-label={`Visible on site: ${row.name}`}
                />
              </label>
              <Select
                aria-label={`Stock status for ${row.name}`}
                value={row.stockStatus}
                disabled={busyId === row.id}
                onChange={(e) => changeStock(row, e.target.value as StockStatus)}
                className="w-40"
              >
                {STOCK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STOCK_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-2">{actions(row)}</div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={toDelete !== null}
        title={toDelete ? `Delete “${toDelete.name}”?` : "Delete product?"}
        confirmLabel="Delete product"
        pending={busyId !== null && busyId === toDelete?.id}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        This removes the product and its photos from the site. Past orders keep their own record of it. This
        cannot be undone.
      </ConfirmDialog>
    </div>
  );
}
