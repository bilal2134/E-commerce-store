/** Shape returned by every admin Server Action used with useActionState. */
export type ActionResult =
  | { ok: true; message?: string; redirectTo?: string }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

export function fail(formError: string, fieldErrors?: Record<string, string>): ActionResult {
  return { ok: false, formError, fieldErrors };
}
