import { BADGE_LABELS, type Badge } from "@/domain/catalog";
import { cn } from "@/lib/cn";

/** Small rectangular tag. Sentence case, never all caps. */
export function BadgeTag({ badge, className }: { badge: Badge; className?: string }) {
  const tone =
    badge === "sale"
      ? "bg-cherry text-white"
      : badge === "collab"
        ? "bg-ink text-petal"
        : "bg-surface text-ink ring-1 ring-line ring-inset";
  return (
    <span className={cn("inline-block rounded-xs px-2 py-0.5 text-2xs font-semibold", tone, className)}>
      {BADGE_LABELS[badge]}
    </span>
  );
}

export function StockTag({ status, className }: { status: "out_of_stock" | "preorder"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-xs px-2 py-0.5 text-2xs font-semibold",
        status === "out_of_stock" ? "bg-ink/85 text-white" : "bg-warning-tint text-warning",
        className,
      )}
    >
      {status === "out_of_stock" ? "Out of stock" : "Preorder"}
    </span>
  );
}
