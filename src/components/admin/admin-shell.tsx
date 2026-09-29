"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logoutAction } from "@/app/admin/sign-in";
import { CloseIcon, LogoutIcon, MenuIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/settings", label: "Settings" },
] as const;

const linkBase =
  "flex min-h-11 items-center rounded-sm px-3 text-sm font-medium transition-colors duration-[var(--duration-fast)]";

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin">
      <ul className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  linkBase,
                  active ? "bg-blush text-cherry-deep" : "text-ink-soft hover:bg-blush hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SecondaryLinks() {
  return (
    <div className="flex flex-col gap-1 border-t border-line pt-3">
      <a
        href="/"
        target="_blank"
        rel="noopener"
        className={cn(linkBase, "text-ink-soft hover:bg-blush hover:text-ink")}
      >
        View site
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      <form action={logoutAction}>
        <button
          type="submit"
          className={cn(linkBase, "w-full gap-2 text-left text-ink-soft hover:bg-blush hover:text-ink")}
        >
          <LogoutIcon size={18} />
          Log out
        </button>
      </form>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The menu is open only for the path it was opened on, so navigating closes it.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (next: boolean) => setOpenFor(next ? pathname : null);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden border-e border-line bg-surface lg:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-6 p-4">
          <Link href="/admin/dashboard" className="px-3 pt-2">
            <span className="type-title block text-xl">USBA</span>
            <span className="text-xs text-muted">Store admin</span>
          </Link>
          <NavLinks pathname={pathname} />
          <div className="mt-auto">
            <SecondaryLinks />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-surface lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/admin/dashboard" className="flex items-baseline gap-2">
              <span className="type-title text-xl">USBA</span>
              <span className="text-xs text-muted">Store admin</span>
            </Link>
            <button
              type="button"
              aria-expanded={open}
              aria-controls="admin-mobile-menu"
              onClick={() => setOpen(!open)}
              className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-sm px-2 text-sm font-medium hover:bg-blush"
            >
              {open ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
              <span>{open ? "Close" : "Menu"}</span>
            </button>
          </div>
          <div id="admin-mobile-menu" hidden={!open} className="border-t border-line p-3">
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <div className="mt-3">
              <SecondaryLinks />
            </div>
          </div>
        </header>
        <main id="admin-main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
