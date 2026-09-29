"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./button";

/**
 * Accessible modal confirmation built on the native <dialog>: the browser
 * traps focus, makes the page inert, closes on Esc and returns focus to the
 * control that opened it. Cancel is focused first so a stray Enter never
 * confirms a destructive action.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  pending = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !pending) onCancel();
      }}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-sm border border-line bg-surface p-0 text-ink shadow-overlay backdrop:bg-ink/40"
    >
      <div className="p-5 sm:p-6">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <div id={descId} className="mt-2 text-sm text-ink-soft">
          {children}
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={pending} autoFocus>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
