import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Form primitives. Errors are linked to inputs with aria-describedby and
 * aria-invalid so screen readers announce them (WCAG 3.3.1).
 */

const control =
  "block w-full rounded-sm border border-control bg-surface px-3 text-base text-ink " +
  "placeholder:text-muted transition-colors hover:border-ink-soft " +
  "focus:border-cherry " +
  "aria-invalid:border-danger disabled:bg-blush disabled:text-muted";

export function Label({ className, children, ...props }: ComponentProps<"label">) {
  return (
    <label className={cn("block text-sm font-medium text-ink", className)} {...props}>
      {children}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-11", className)} {...props}>
      {children}
    </select>
  );
}

export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-sm text-muted">
      {children}
    </p>
  );
}

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 text-sm font-medium text-danger" role="alert">
      {children}
    </p>
  );
}

/** Label + control + hint + error with correct ARIA wiring. */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: (aria: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
    required?: boolean;
  }) => ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-cherry" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </Label>
      <div className="mt-1.5">
        {children({
          id,
          "aria-describedby": describedBy,
          "aria-invalid": error ? true : undefined,
          required,
        })}
      </div>
      {hint && hintId ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
