"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusMessage } from "@/components/admin/status-message";
import { fieldErrorsFrom } from "@/domain/validation/common";
import { adminReviewFromFormData, adminReviewSchema } from "@/domain/validation/review";
import { createReviewAction } from "../actions";

export function ReviewForm({ products }: { products: { id: string; name: string; code: string }[] }) {
  const [state, run, pending] = useActionState(createReviewAction, null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(0);
  const [seen, setSeen] = useState(state);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  if (state !== seen) {
    setSeen(state);
    setDismissed({});
    if (state?.ok) {
      // Clear the fields after a successful save.
      setVersion((v) => v + 1);
      setClientErrors({});
    }
  }
  const serverErrors = (state && !state.ok ? state.fieldErrors : undefined) ?? {};
  const error = (f: string) => clientErrors[f] ?? (dismissed[f] ? undefined : serverErrors[f]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = adminReviewSchema.safeParse(adminReviewFromFormData(fd));
    if (!parsed.success) {
      setClientErrors(fieldErrorsFrom(parsed.error));
      const form = e.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    setClientErrors({});
    startTransition(() => run(fd));
  }

  const clear = (f: string) => () => {
    setClientErrors((c) => Object.fromEntries(Object.entries(c).filter(([k]) => k !== f)));
    setDismissed((d) => ({ ...d, [f]: true }));
  };

  return (
    <details className="group rounded-sm border border-line bg-surface" open={Boolean(state && !state.ok)}>
      <summary className="flex min-h-11 cursor-pointer items-center justify-between px-4 py-2 text-sm font-semibold">
        Add a review manually
        <span className="text-xs font-normal text-muted group-open:hidden">
          Feedback from Instagram or WhatsApp
        </span>
      </summary>
      <form
        onSubmit={onSubmit}
        noValidate
        className="space-y-4 border-t border-line p-4"
        aria-label="Add review"
      >
        <div key={version} className="grid gap-4 sm:grid-cols-2">
          <Field id="review-name" label="Customer name" required error={error("customerName")}>
            {(aria) => (
              <Input
                {...aria}
                name="customerName"
                maxLength={80}
                autoComplete="off"
                onChange={clear("customerName")}
              />
            )}
          </Field>
          <Field id="review-rating" label="Rating (optional)" error={error("rating")}>
            {(aria) => (
              <Select {...aria} name="rating" defaultValue="" onChange={clear("rating")}>
                <option value="">No rating</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "star" : "stars"}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="review-body" label="Review" required error={error("body")} className="sm:col-span-2">
            {(aria) => <Textarea {...aria} name="body" rows={3} maxLength={2000} onChange={clear("body")} />}
          </Field>
          <Field id="review-product" label="Product (optional)" error={error("productId")}>
            {(aria) => (
              <Select {...aria} name="productId" defaultValue="" onChange={clear("productId")}>
                <option value="">Not linked to a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="review-photo" label="Photo (optional)" hint="JPEG, PNG or WebP up to 10 MB.">
            {(aria) => (
              <Input
                {...aria}
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="h-auto py-2 file:me-3 file:rounded-sm file:border-0 file:bg-blush file:px-3 file:py-1.5 file:text-sm"
              />
            )}
          </Field>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:flex-1">
            <StatusMessage result={state} />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add and publish review"}
          </Button>
        </div>
      </form>
    </details>
  );
}
