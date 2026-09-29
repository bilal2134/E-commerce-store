"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import type { ActionResult } from "@/domain/validation/result";

/**
 * useActionState wired to onSubmit. Calling the action inside a transition
 * (instead of `<form action>`) stops React from resetting the form after
 * submit, so the admin never loses what they typed when validation fails.
 */
export function useActionForm(
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>,
) {
  const [state, run, pending] = useActionState(action, null);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => run(data));
  }
  return {
    state,
    pending,
    onSubmit,
    fieldErrors: (state && !state.ok ? state.fieldErrors : undefined) ?? {},
  };
}
