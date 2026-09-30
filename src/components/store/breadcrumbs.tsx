import type { Route } from "next";
import Link from "next/link";
import type { Crumb } from "@/domain/category";
import { ChevronRightIcon } from "@/components/ui/icons";

export function Breadcrumbs({ crumbs }: { crumbs: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.href} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="text-ink-soft">
                  {c.name}
                </span>
              ) : (
                <>
                  <Link
                    href={c.href as Route}
                    className="inline-flex min-h-8 items-center hover:text-ink hover:underline"
                  >
                    {c.name}
                  </Link>
                  <ChevronRightIcon size={12} className="rtl:-scale-x-100" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
