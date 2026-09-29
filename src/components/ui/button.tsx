import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "whatsapp" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-sm " +
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] " +
  "disabled:opacity-50 aria-disabled:opacity-50 aria-disabled:pointer-events-none select-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-cherry text-white hover:bg-cherry-deep active:bg-cherry-deep",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink hover:bg-surface",
  ghost: "text-ink hover:bg-blush",
  whatsapp: "bg-whatsapp text-white hover:bg-whatsapp-deep",
  danger: "bg-danger text-white hover:brightness-95",
  link: "text-cherry underline underline-offset-4 decoration-1 hover:decoration-2 px-0! h-auto!",
};

/* Sizes keep touch targets ≥ 44px on md/lg (WCAG 2.5.8 needs ≥ 24px). */
const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-6 text-base",
};

export function buttonClasses(opts: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[opts.variant ?? "primary"], sizes[opts.size ?? "md"], opts.className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}
