"use client";

import { useActionState } from "react";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { submitReview, type ReviewFormState } from "./actions";

const initial: ReviewFormState = { status: "idle" };

export function ReviewForm() {
  const [state, action, pending] = useActionState(async (prev: ReviewFormState, data: FormData) => {
    const next = await submitReview(prev, data);
    if (next.status === "success") track("review_submit");
    return next;
  }, initial);

  if (state.status === "success") {
    return (
      <div role="status" className="border border-success/30 bg-success-tint px-5 py-6">
        <p className="font-semibold text-success">Thank you — your review was sent.</p>
        <p className="mt-1 text-sm text-ink-soft">It will appear on this page once USBA has approved it.</p>
      </div>
    );
  }

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} noValidate className="grid gap-5">
      {state.status === "error" ? (
        <p role="alert" className="rounded-sm bg-danger-tint px-4 py-3 text-sm font-medium text-danger">
          {state.message}
        </p>
      ) : null}
      <Field id="review-name" label="Your name" required error={errors.customerName}>
        {(aria) => <Input {...aria} name="customerName" autoComplete="given-name" maxLength={80} />}
      </Field>
      <Field
        id="review-body"
        label="Your review"
        required
        error={errors.body}
        hint="What did you order and how did you like it?"
      >
        {(aria) => <Textarea {...aria} name="body" maxLength={1000} rows={5} />}
      </Field>
      <fieldset>
        <legend className="text-sm font-medium text-ink">Rating (optional)</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[5, 4, 3, 2, 1].map((n) => (
            <label key={n} className="relative">
              <input type="radio" name="rating" value={n} className="peer sr-only" />
              <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-sm border border-line-strong bg-surface px-3 text-sm peer-checked:border-cherry peer-checked:bg-cherry-tint peer-checked:text-cherry-deep peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cherry">
                {n} {n === 1 ? "star" : "stars"}
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
          {pending ? "Sending…" : "Send review"}
        </Button>
        <p className="mt-2 text-xs text-muted">Reviews are checked by USBA before they&apos;re published.</p>
      </div>
    </form>
  );
}
