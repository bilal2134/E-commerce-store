"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { loginAction, type LoginState } from "../sign-in";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState | null, FormData>(loginAction, null);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.formError ? (
        <p role="alert" className="rounded-sm bg-danger-tint px-3 py-2 text-sm font-medium text-danger">
          {state.formError}
        </p>
      ) : null}
      <Field id="email" label="Email">
        {(aria) => (
          <Input
            {...aria}
            name="email"
            type="email"
            autoComplete="username"
            defaultValue={state?.email ?? ""}
            key={state?.email ?? "initial"}
            required
          />
        )}
      </Field>
      <Field id="password" label="Password">
        {(aria) => (
          <Input {...aria} name="password" type="password" autoComplete="current-password" required />
        )}
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
