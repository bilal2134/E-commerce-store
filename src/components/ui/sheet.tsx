"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CloseIcon } from "./icons";

/**
 * Modal sheet built on the native <dialog> element: showModal() provides the
 * focus trap, Esc to close, an inert background and top-layer stacking.
 * Focus returns to the opener automatically when it closes.
 */
export function Sheet({
  open,
  onClose,
  title,
  side = "right",
  children,
  footer,
  className,
  hideTitle = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right" | "bottom" | "top";
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  hideTitle?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const position = {
    left: "m-0 me-auto h-dvh max-h-dvh w-[min(24rem,88vw)] max-w-none",
    right: "m-0 ms-auto h-dvh max-h-dvh w-[min(26rem,92vw)] max-w-none",
    bottom: "mx-0 mt-auto mb-0 max-h-[88dvh] w-full max-w-none rounded-t-md",
    top: "mx-auto mt-0 mb-auto w-full max-w-3xl rounded-b-md sm:mt-16 sm:rounded-md",
  }[side];

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clicks on the backdrop target the <dialog> itself.
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        // The dialog is the flex container and never scrolls itself; only the
        // body region scrolls, so the header and footer stay in view.
        "sheet overflow-hidden bg-surface p-0 text-ink shadow-overlay backdrop:bg-ink/40 open:flex open:flex-col",
        position,
        `sheet-${side}`,
        className,
      )}
    >
      {hideTitle ? (
        // Title for assistive tech only; the content supplies its own close control.
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
      ) : (
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-me-2 inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-blush"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      {footer ? <div className="shrink-0 border-t border-line bg-surface px-5 py-3">{footer}</div> : null}
    </dialog>
  );
}
