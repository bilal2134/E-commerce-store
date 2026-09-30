"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { Locale } from "@/i18n/config";
import { dictionaryFor } from "@/i18n/dictionaries";
import { submitReview, type ReviewField, type ReviewFormState } from "./actions";

const initial: ReviewFormState = { status: "idle" };

export function ReviewForm({ locale }: { locale: Locale }) {
  const t = dictionaryFor(locale);
  const [state, action, pending] = useActionState(async (prev: ReviewFormState, data: FormData) => {
    const next = await submitReview(prev, data);
    if (next.status === "success") track("review_submit");
    return next;
  }, initial);
  const formRef = useRef<HTMLFormElement>(null);

  // After a failed submit, move focus to the first invalid field (or the summary).
  useEffect(() => {
    if (state.status !== "error") return;
    const form = formRef.current;
    (
      form?.querySelector<HTMLElement>("[aria-invalid='true']") ??
      form?.querySelector<HTMLElement>("[role='alert']")
    )?.focus();
  }, [state]);

  // Submitting via onSubmit (not the form `action` prop) keeps what the customer
  // typed when validation fails; React resets forms after `action` submissions.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  }

  if (state.status === "success") {
    return (
      <div role="status" className="border border-success/30 bg-success-tint px-5 py-6">
        <p className="font-semibold text-success">{t.reviews.thanks}</p>
        <p className="mt-1 text-sm text-ink-soft">{t.reviews.thanksBody}</p>
      </div>
    );
  }

  const fieldMessages: Record<ReviewField, string> = {
    customerName: t.reviews.errorName,
    body: t.reviews.errorBody,
    rating: t.reviews.errorRating,
  };
  const invalid = new Set(state.status === "error" ? (state.fields ?? []) : []);
  const errors = Object.fromEntries([...invalid].map((f) => [f, fieldMessages[f]])) as Partial<
    Record<ReviewField, string>
  >;
  const formError =
    state.status !== "error"
      ? null
      : state.code === "invalid"
        ? t.reviews.errorFix
        : state.code === "rate_limited"
          ? t.reviews.errorRateLimited
          : t.reviews.errorFailed;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-5">
      {formError ? (
        <p
          role="alert"
          tabIndex={-1}
          className="rounded-sm bg-danger-tint px-4 py-3 text-sm font-medium text-danger"
        >
          {formError}
        </p>
      ) : null}
      <Field id="review-name" label={t.reviews.formName} required error={errors.customerName}>
        {(aria) => <Input {...aria} name="customerName" autoComplete="name" maxLength={80} />}
      </Field>
      <Field
        id="review-body"
        label={t.reviews.formBody}
        required
        error={errors.body}
        hint={t.reviews.formBodyHint}
      >
        {(aria) => <Textarea {...aria} name="body" maxLength={1000} rows={5} />}
      </Field>
      <fieldset>
        <legend className="text-sm font-medium text-ink">{t.reviews.formRating}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[5, 4, 3, 2, 1].map((n) => (
            <label key={n} className="relative">
              <input type="radio" name="rating" value={n} className="peer sr-only" />
              <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-sm border border-control bg-surface px-3 text-sm peer-checked:border-cherry peer-checked:bg-cherry-tint peer-checked:text-cherry-deep peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cherry">
                {t.reviews.stars(n)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {/* Honeypot, hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.reviews.sending : t.reviews.send}
        </Button>
        <p className="mt-2 text-xs text-muted">{t.reviews.moderationNote}</p>
      </div>
    </form>
  );
}
