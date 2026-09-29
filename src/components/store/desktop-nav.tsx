"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavLink } from "@/lib/navigation";
import { cn } from "@/lib/cn";

/** Desktop category bar; marks the current section with aria-current. */
export function DesktopNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden lg:block">
      <ul className="flex items-center gap-x-1 xl:gap-x-2">
        {links.map((l) => {
          const current = pathname === l.href;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-11 items-center px-2 text-sm transition-colors",
                  "after:absolute after:inset-x-2 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform",
                  "hover:after:scale-x-100 aria-[current=page]:after:scale-x-100",
                  l.emphasis ? "font-semibold text-cherry" : "text-ink",
                )}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
