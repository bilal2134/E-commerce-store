import type { Badge } from "@/domain/catalog";
import { getDictionary } from "@/i18n/server";
import { cn } from "@/lib/cn";

/** Small rectangular tag. Sentence case, never all caps. */
export async function BadgeTag({ badge, className }: { badge: Badge; className?: string }) {
  const t = await getDictionary();
  const tone =
    badge === "sale"
      ? "bg-cherry text-white"
      : badge === "collab"
        ? "bg-ink text-petal"
        : "bg-surface text-ink ring-1 ring-line ring-inset";
  return (
    <span className={cn("inline-block rounded-xs px-2 py-0.5 text-2xs font-semibold", tone, className)}>
      {t.badges[badge]}
    </span>
  );
}

export async function StockTag({
  status,
  className,
}: {
  status: "out_of_stock" | "preorder";
  className?: string;
}) {
  const t = await getDictionary();
  return (
    <span
      className={cn(
        "inline-block rounded-xs px-2 py-0.5 text-2xs font-semibold",
        status === "out_of_stock" ? "bg-ink/85 text-white" : "bg-warning-tint text-warning",
        className,
      )}
    >
      {t.stock[status]}
    </span>
  );
}
