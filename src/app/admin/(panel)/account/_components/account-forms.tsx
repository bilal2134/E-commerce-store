"use client";

import { useState } from "react";
import { StatusMessage } from "@/components/admin/status-message";
import { Panel } from "@/components/admin/ui";
import { useActionForm } from "@/components/admin/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { ActionResult } from "@/domain/validation/result";
import { changePasswordAction, signOutOtherSessionsAction } from "../actions";

export function AccountForms({ otherSessions }: { otherSessions: number }) {
  const { state, pending, onSubmit, fieldErrors } = useActionForm(changePasswordAction);
  const [signOutResult, setSignOutResult] = useState<ActionResult | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="space-y-6">
      <Panel
        title="Change password"
        description="Use at least 12 characters. A long passphrase is easiest to remember."
      >
        <form onSubmit={onSubmit} noValidate aria-label="Change password" className="space-y-4">
          <Field id="currentPassword" label="Current password" required error={fieldErrors.currentPassword}>
            {(aria) => (
              <Input {...aria} name="currentPassword" type="password" autoComplete="current-password" />
            )}
          </Field>
          <Field id="newPassword" label="New password" required error={fieldErrors.newPassword}>
            {(aria) => (
              <Input
                {...aria}
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
              />
            )}
          </Field>
          <Field
            id="confirmPassword"
            label="Confirm new password"
            required
            error={fieldErrors.confirmPassword}
          >
            {(aria) => <Input {...aria} name="confirmPassword" type="password" autoComplete="new-password" />}
          </Field>
          <StatusMessage result={state} />
          <Button type="submit" disabled={pending}>
            {pending ? "Changing…" : "Change password"}
          </Button>
        </form>
      </Panel>

      <Panel title="Other sessions">
        <p className="text-sm text-ink-soft">
          {otherSessions
            ? `You're signed in on ${otherSessions} other ${otherSessions === 1 ? "session" : "sessions"}.`
            : "You're not signed in anywhere else."}
        </p>
        <StatusMessage result={signOutResult} className="mt-3" />
        <Button
          variant="secondary"
          className="mt-4"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            setSignOutResult(await signOutOtherSessionsAction());
            setSigningOut(false);
          }}
        >
          Sign out other sessions
        </Button>
      </Panel>
    </div>
  );
}
