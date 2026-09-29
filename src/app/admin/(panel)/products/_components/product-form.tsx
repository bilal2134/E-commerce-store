"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Panel } from "@/components/admin/ui";
import { StatusMessage } from "@/components/admin/status-message";
import { useActionForm } from "@/components/admin/use-action-form";
import {
  BADGE_LABELS,
  BADGES,
  COLOR_LABELS,
  COLOR_SWATCHES,
  COLORS,
  FOOTWEAR_SIZES,
  SIZED_ROOT_CATEGORY,
  STOCK_STATUS_LABELS,
  STOCK_STATUSES,
} from "@/domain/catalog";
import { fieldErrorsFrom, slugify } from "@/domain/validation/common";
import {
  productFormSchema,
  type ProductFormValues,
  type ProductImageDraft,
} from "@/domain/validation/product";
import type { CategoryGroup } from "@/server/admin/products";
import { saveProductAction } from "../actions";
import { ProductImagesField } from "./product-images-field";

export interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
  code?: string;
  categoryGroups: CategoryGroup[];
  initial: Omit<ProductFormValues, "images">;
  initialImages: ProductImageDraft[];
  defaultCollabHandle: string;
  notice?: string;
}

type Errors = Record<string, string>;

export function ProductForm(props: ProductFormProps) {
  const { mode, productId, categoryGroups, defaultCollabHandle } = props;
  const [v, setV] = useState(props.initial);
  const [images, setImages] = useState(props.initialImages);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { state, pending, onSubmit, fieldErrors: serverErrors } = useActionForm(saveProductAction);

  // Server-side errors are shown until the admin edits that field.
  const [seenState, setSeenState] = useState(state);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  if (state !== seenState) {
    setSeenState(state);
    setDismissed({});
  }

  const rootSlug = useMemo(
    () => categoryGroups.find((g) => g.children.some((c) => c.id === v.categoryId))?.rootSlug ?? "",
    [categoryGroups, v.categoryId],
  );
  const sized = rootSlug === SIZED_ROOT_CATEGORY;
  const effectiveSizes = sized ? v.sizes : [];

  const values: ProductFormValues = { ...v, sizes: effectiveSizes, images };
  const parsed = productFormSchema.safeParse(values);
  const clientErrors: Errors = parsed.success ? {} : fieldErrorsFrom(parsed.error);
  const error = (field: string): string | undefined => {
    const c = clientErrors[field];
    if (c && (touched[field] || attempted)) return c;
    if (!c && !dismissed[field]) return serverErrors[field];
    return undefined;
  };

  function set<K extends keyof typeof v>(key: K, value: (typeof v)[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
    setDismissed((d) => ({ ...d, [key]: true }));
  }
  const touch = (field: string) => () => setTouched((t) => ({ ...t, [field]: true }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setAttempted(true);
    if (!parsed.success || uploading) {
      event.preventDefault();
      const form = event.currentTarget;
      requestAnimationFrame(() => {
        const first = form.querySelector<HTMLElement>("[aria-invalid='true']");
        first?.focus();
      });
      return;
    }
    onSubmit(event);
  }

  function toggleSize(label: (typeof FOOTWEAR_SIZES)[number], offered: boolean) {
    set(
      "sizes",
      offered ? [...v.sizes, { label, isAvailable: true }] : v.sizes.filter((s) => s.label !== label),
    );
  }

  function toggleColor(color: string, on: boolean) {
    set("colors", on ? [...v.colors, color] : v.colors.filter((c) => c !== color));
  }

  const imagePayload = images.map((img) => ({
    storageKey: img.storageKey,
    widths: img.widths,
    width: img.width,
    height: img.height,
    blurDataUrl: img.blurDataUrl,
    alt: img.alt,
  }));
  const visibleBlocked = v.isVisible && images.length < 2;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6"
      aria-label={mode === "edit" ? "Edit product" : "New product"}
    >
      {productId ? <input type="hidden" name="productId" value={productId} /> : null}
      <input type="hidden" name="images" value={JSON.stringify(imagePayload)} />
      <input type="hidden" name="sizes" value={JSON.stringify(effectiveSizes)} />

      {props.notice ? <StatusMessage result={{ ok: true, message: props.notice }} /> : null}

      <Panel title="Basics">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="name" label="Name" required error={error("name")} className="sm:col-span-2">
            {(aria) => (
              <Input
                {...aria}
                name="name"
                value={v.name}
                maxLength={120}
                onBlur={touch("name")}
                onChange={(e) => {
                  const name = e.target.value;
                  setV((prev) => ({ ...prev, name, slug: slugTouched ? prev.slug : slugify(name) }));
                  setDismissed((d) => ({ ...d, name: true, ...(slugTouched ? {} : { slug: true }) }));
                }}
              />
            )}
          </Field>
          <Field
            id="slug"
            label="URL slug"
            required
            error={error("slug")}
            hint={
              <>
                The product link will be <span className="font-medium">/product/{v.slug || "your-slug"}</span>
              </>
            }
          >
            {(aria) => (
              <Input
                {...aria}
                name="slug"
                value={v.slug}
                maxLength={90}
                autoCapitalize="none"
                spellCheck={false}
                onBlur={touch("slug")}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value);
                }}
              />
            )}
          </Field>
          <Field id="categoryId" label="Category" required error={error("categoryId")}>
            {(aria) => (
              <Select
                {...aria}
                name="categoryId"
                value={v.categoryId}
                onBlur={touch("categoryId")}
                onChange={(e) => set("categoryId", e.target.value)}
              >
                <option value="">Choose a category</option>
                {categoryGroups.map((g) => (
                  <optgroup key={g.rootSlug} label={g.rootName}>
                    {g.children.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            )}
          </Field>
          <Field
            id="description"
            label="Description"
            required
            error={error("description")}
            className="sm:col-span-2"
          >
            {(aria) => (
              <Textarea
                {...aria}
                name="description"
                value={v.description}
                rows={5}
                onBlur={touch("description")}
                onChange={(e) => set("description", e.target.value)}
              />
            )}
          </Field>
        </div>
      </Panel>

      <Panel title="Price and availability">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field id="price" label="Price (Rs.)" required error={error("price")} hint="Whole rupees">
            {(aria) => (
              <Input
                {...aria}
                name="price"
                inputMode="numeric"
                value={v.price}
                onBlur={touch("price")}
                onChange={(e) => set("price", e.target.value)}
              />
            )}
          </Field>
          <Field
            id="salePrice"
            label="Sale price (Rs.)"
            error={error("salePrice")}
            hint="Optional. Must be lower than the price."
          >
            {(aria) => (
              <Input
                {...aria}
                name="salePrice"
                inputMode="numeric"
                value={v.salePrice}
                onBlur={touch("salePrice")}
                onChange={(e) => set("salePrice", e.target.value)}
              />
            )}
          </Field>
          <Field id="stockStatus" label="Stock status" error={error("stockStatus")}>
            {(aria) => (
              <Select
                {...aria}
                name="stockStatus"
                value={v.stockStatus}
                onChange={(e) => set("stockStatus", e.target.value as typeof v.stockStatus)}
              >
                {STOCK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STOCK_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="badge" label="Badge" error={error("badge")}>
            {(aria) => (
              <Select {...aria} name="badge" value={v.badge} onChange={(e) => set("badge", e.target.value)}>
                <option value="">No badge</option>
                {BADGES.map((b) => (
                  <option key={b} value={b}>
                    {BADGE_LABELS[b]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium">Colours</legend>
          <p className="mt-1 text-sm text-muted">Used for the colour filter in the shop.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {COLORS.map((c) => {
              const on = v.colors.includes(c);
              return (
                <label
                  key={c}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-line-strong px-3 text-sm has-[:checked]:border-cherry has-[:checked]:bg-cherry-tint has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cherry"
                >
                  <input
                    type="checkbox"
                    name="colors"
                    value={c}
                    checked={on}
                    onChange={(e) => toggleColor(c, e.target.checked)}
                    className="size-4 accent-cherry"
                  />
                  <span
                    aria-hidden="true"
                    className="size-4 rounded-full border border-line-strong"
                    style={{ background: COLOR_SWATCHES[c] }}
                  />
                  {COLOR_LABELS[c]}
                </label>
              );
            })}
          </div>
        </fieldset>
      </Panel>

      {sized ? (
        <Panel
          title="Sizes"
          description="Tick the sizes you offer. Untick “Available” when a size is sold out."
        >
          <fieldset>
            <legend className="sr-only">Sizes offered</legend>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {FOOTWEAR_SIZES.map((label) => {
                const entry = v.sizes.find((s) => s.label === label);
                return (
                  <li key={label} className="rounded-sm border border-line p-3">
                    <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={Boolean(entry)}
                        onChange={(e) => toggleSize(label, e.target.checked)}
                        className="size-4 accent-cherry"
                      />
                      Size {label}
                    </label>
                    <label
                      className={`flex min-h-11 items-center gap-2 text-sm ${entry ? "text-ink-soft" : "text-muted opacity-60"}`}
                    >
                      <input
                        type="checkbox"
                        checked={entry?.isAvailable ?? false}
                        disabled={!entry}
                        onChange={(e) =>
                          set(
                            "sizes",
                            v.sizes.map((s) =>
                              s.label === label ? { ...s, isAvailable: e.target.checked } : s,
                            ),
                          )
                        }
                        className="size-4 accent-cherry"
                      />
                      Available
                      <span className="sr-only"> in size {label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          {error("sizes") ? (
            <p role="alert" className="mt-2 text-sm font-medium text-danger">
              {error("sizes")}
            </p>
          ) : null}
        </Panel>
      ) : null}

      <Panel title="Photos">
        <ProductImagesField
          images={images}
          setImages={setImages}
          error={error("images")}
          onBusyChange={setUploading}
        />
      </Panel>

      <Panel title="Visibility and promotion">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p id="visible-label" className="text-sm font-medium">
                Visible on site
              </p>
              <p id="visible-hint" className="text-sm text-muted">
                {v.isVisible
                  ? "Customers can see and order this product."
                  : "Hidden. Saved as a draft that only you can see."}
              </p>
              {visibleBlocked ? (
                <p role="alert" className="mt-1 text-sm font-medium text-danger">
                  Add at least 2 photos to show this product on the site.
                </p>
              ) : null}
            </div>
            <Switch
              checked={v.isVisible}
              onCheckedChange={(next) => set("isVisible", next)}
              aria-labelledby="visible-label"
              aria-describedby="visible-hint"
            />
            {v.isVisible ? <input type="hidden" name="isVisible" value="on" /> : null}
          </div>

          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="featured"
              checked={v.featured}
              onChange={(e) => set("featured", e.target.checked)}
              className="mt-1 size-4 accent-cherry"
            />
            <span>
              <span className="font-medium">Featured on homepage</span>
              <span className="block text-muted">
                Featured products appear in the homepage selection. Change the order under Homepage order.
              </span>
            </span>
          </label>

          <div>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="collab"
                checked={v.collab}
                onChange={(e) => {
                  set("collab", e.target.checked);
                  if (e.target.checked && v.collabPartner === "") set("collabPartner", defaultCollabHandle);
                }}
                className="mt-1 size-4 accent-cherry"
              />
              <span>
                <span className="font-medium">Collaboration item</span>
                <span className="block text-muted">
                  Shows in the collab collection with the partner’s handle.
                </span>
              </span>
            </label>
            {v.collab ? (
              <Field
                id="collabPartner"
                label="Partner Instagram handle"
                error={error("collabPartner")}
                className="mt-3 max-w-sm ps-7"
              >
                {(aria) => (
                  <Input
                    {...aria}
                    name="collabPartner"
                    value={v.collabPartner}
                    autoCapitalize="none"
                    spellCheck={false}
                    onBlur={touch("collabPartner")}
                    onChange={(e) => set("collabPartner", e.target.value)}
                  />
                )}
              </Field>
            ) : null}
          </div>
        </div>
      </Panel>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-sm lg:border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-9 sm:flex-1">
            <StatusMessage result={state} successFallback="Product saved" />
            {attempted && !parsed.success && !state ? (
              <p role="alert" className="text-sm font-medium text-danger">
                Fix the highlighted fields and save again.
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products"
              className="inline-flex h-11 items-center rounded-sm px-4 text-sm font-medium text-ink-soft hover:bg-blush"
            >
              Back to products
            </Link>
            <Button type="submit" disabled={pending || uploading}>
              {pending ? "Saving…" : uploading ? "Uploading photos…" : "Save product"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
