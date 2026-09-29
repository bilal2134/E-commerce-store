import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ProductCard as ProductCardData } from "@/domain/product";
import { cn } from "@/lib/cn";
import { ChevronRightIcon } from "@/components/ui/icons";
import { ProductCard } from "./product-card";

export function SectionHeader({
  id,
  title,
  description,
  action,
  tone = "ink",
}: {
  id: string;
  title: string;
  description?: string;
  action?: { href: Route; label: string };
  tone?: "ink" | "cherry" | "petal";
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 md:mb-7">
      <div>
        <h2
          id={id}
          className={cn(
            "type-title text-3xl md:text-4xl",
            tone === "cherry" && "text-cherry",
            tone === "petal" && "text-petal",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className={cn("mt-2 max-w-prose text-sm", tone === "petal" ? "text-petal/80" : "text-ink-soft")}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className={cn(
            "inline-flex h-11 items-center gap-1 text-sm font-medium underline-offset-4 hover:underline",
            tone === "petal" ? "text-petal" : "text-ink",
          )}
        >
          {action.label}
          <ChevronRightIcon size={16} />
        </Link>
      ) : null}
    </div>
  );
}

/** Horizontal snap scroller on small screens, a grid from lg up. */
export function ProductRail({
  products,
  label,
  columns = 4,
}: {
  products: ProductCardData[];
  label: string;
  columns?: 4 | 5;
}) {
  return (
    <ul
      aria-label={label}
      className={cn(
        "scroller -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 md:-mx-6 md:scroll-px-6 md:px-6",
        "lg:mx-0 lg:grid lg:gap-x-5 lg:gap-y-10 lg:overflow-visible lg:px-0 lg:pb-0",
        columns === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
      )}
    >
      {products.map((p) => (
        <li key={p.id} className="w-[44vw] max-w-60 shrink-0 snap-start sm:w-[30vw] lg:w-auto lg:max-w-none">
          <ProductCard product={p} sizes="(min-width: 64rem) 22vw, (min-width: 40rem) 30vw, 44vw" />
        </li>
      ))}
    </ul>
  );
}

export function ProductGrid({
  products,
  label,
  priorityCount = 0,
}: {
  products: ProductCardData[];
  label: string;
  priorityCount?: number;
}) {
  return (
    <ul
      aria-label={label}
      className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-10"
    >
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function Section({
  labelledBy,
  className,
  children,
}: {
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={labelledBy} className={cn("container-page mt-16 md:mt-24", className)}>
      {children}
    </section>
  );
}
