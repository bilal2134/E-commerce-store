"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * On/off switch (role="switch"). The hit area is 44px tall; the visible track
 * is smaller. Provide an accessible name with aria-label or aria-labelledby.
 */
export function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
  ...props
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
} & Omit<ComponentProps<"button">, "onClick" | "role" | "aria-checked" | "type">) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn("group inline-flex h-11 min-w-11 items-center justify-center", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative h-6 w-11 rounded-full border transition-colors duration-[var(--duration-fast)] group-disabled:opacity-50",
          checked ? "border-cherry bg-cherry" : "border-line-strong bg-blush",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4.5 rounded-full bg-white shadow-sm transition-[inset-inline-start] duration-[var(--duration-fast)]",
            checked ? "start-5.5" : "start-0.5",
          )}
        />
      </span>
    </button>
  );
}
