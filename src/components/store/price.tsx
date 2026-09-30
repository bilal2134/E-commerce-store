import { formatPkr, priceInfo } from "@/domain/money";
import { getDictionary } from "@/i18n/server";
import { cn } from "@/lib/cn";

/** Current price, with the original crossed out when on sale (CS-06, AS-10). */
export async function Price({
  pricePkr,
  salePricePkr,
  size = "sm",
  className,
}: {
  pricePkr: number;
  salePricePkr: number | null;
  size?: "sm" | "lg";
  className?: string;
}) {
  const t = await getDictionary();
  const p = priceInfo(pricePkr, salePricePkr);
  const big = size === "lg";
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      {p.original !== null ? (
        <>
          <span className={cn("font-semibold text-cherry", big ? "text-2xl" : "text-sm")}>
            <span className="sr-only">{t.product.salePrice} </span>
            {formatPkr(p.current)}
          </span>
          <s className={cn("text-muted", big ? "text-base" : "text-xs")}>
            <span className="sr-only">{t.product.originalPrice} </span>
            {formatPkr(p.original)}
          </s>
          {big ? (
            <span className="rounded-xs bg-cherry-tint px-1.5 py-0.5 text-xs font-semibold text-cherry-deep">
              {t.product.percentOff(p.discountPercent ?? 0)}
            </span>
          ) : null}
        </>
      ) : (
        <span className={cn("font-semibold text-ink", big ? "text-2xl" : "text-sm")}>
          {formatPkr(p.current)}
        </span>
      )}
    </p>
  );
}
