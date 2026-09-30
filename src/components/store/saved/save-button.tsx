import { HeartIcon } from "@/components/ui/icons";
import { getDictionary } from "@/i18n/server";
import { cn } from "@/lib/cn";

/**
 * Save / wishlist toggle (CS-21). Deliberately a plain server-rendered button:
 * the single <SavedProvider> in the store layout handles clicks by event
 * delegation and keeps `aria-pressed` in sync, so a 50-card grid ships no
 * per-card client code. Unsaved (outline) before hydration; filled state is
 * pure CSS off `aria-pressed="true"`.
 */
const HEART_FILL = "[&[aria-pressed=true]_svg]:fill-cherry [&[aria-pressed=true]_svg]:text-cherry";

export async function SaveButton({
  slug,
  name,
  variant = "card",
  className,
}: {
  slug: string;
  name: string;
  variant?: "card" | "page";
  className?: string;
}) {
  const t = await getDictionary();
  if (variant === "card") {
    return (
      <button
        type="button"
        data-save-slug={slug}
        data-save-name={name}
        aria-pressed="false"
        aria-label={t.product.save(name)}
        className={cn(
          "group/save absolute end-0 top-0 z-10 flex size-11 items-center justify-center text-ink",
          HEART_FILL,
          className,
        )}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-petal/90 transition-colors group-hover/save:bg-surface">
          <HeartIcon size={18} />
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      data-save-slug={slug}
      data-save-name={name}
      aria-pressed="false"
      className={cn(
        "group/save inline-flex h-11 items-center gap-2 rounded-sm border border-control bg-surface px-4 text-sm font-medium text-ink hover:border-ink",
        HEART_FILL,
        className,
      )}
    >
      <HeartIcon size={18} />
      <span className="group-aria-pressed/save:hidden">{t.product.saveToList}</span>
      <span className="hidden group-aria-pressed/save:inline">{t.product.saved}</span>
    </button>
  );
}
