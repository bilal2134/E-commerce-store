import "server-only";

/** A failure the admin can fix (bad input, conflict). Message is safe to show. */
export class AdminError extends Error {
  readonly fieldErrors?: Record<string, string>;
  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "AdminError";
    this.fieldErrors = fieldErrors;
  }
}

/** Postgres unique-violation constraint name (23505), looking through driver wrappers. */
export function uniqueViolation(err: unknown): string | null {
  let e: unknown = err;
  for (let i = 0; i < 4 && e && typeof e === "object"; i++) {
    const rec = e as { code?: unknown; constraint_name?: unknown; cause?: unknown };
    if (rec.code === "23505") return typeof rec.constraint_name === "string" ? rec.constraint_name : "";
    e = rec.cause;
  }
  return null;
}
