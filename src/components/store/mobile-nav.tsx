"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { localePath, type Locale } from "@/i18n/config";
import { dictionaryFor } from "@/i18n/dictionaries";
import type { NavLink } from "@/lib/navigation";
import { LanguageSwitch } from "./language-switch";
import { InstagramIcon, MenuIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";

export interface MobileNavGroup {
  title: string;
  href: Route;
  children: { href: Route; label: string }[];
}

/** Off-canvas menu for < lg screens. Without JS the trigger links to /shop. */
export function MobileNav({
  locale,
  groups,
  collections,
  info,
  instagramUrl,
}: {
  locale: Locale;
  groups: MobileNavGroup[];
  collections: NavLink[];
  info: NavLink[];
  instagramUrl: string | null;
}) {
  const t = dictionaryFor(locale);
  const shopHref = localePath(locale, "/shop") as Route;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const linkClass = "flex min-h-11 items-center text-ink hover:text-cherry";
  return (
    <>
      {/* Plain link on purpose: without JS it navigates; with JS it opens the sheet. */}
      <a
        href={shopHref}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        role="button"
        aria-haspopup="dialog"
        className="inline-flex size-11 items-center justify-center rounded-sm text-ink hover:bg-blush lg:hidden"
      >
        <MenuIcon />
        <span className="sr-only">{t.common.menu}</span>
      </a>
      <Sheet open={open} onClose={close} title={t.common.menu} side="left" closeLabel={t.common.close}>
        <nav aria-label={t.nav.mobile} className="px-5 py-4">
          <ul className="mb-4 flex flex-wrap gap-2">
            <li>
              <Link
                href={shopHref}
                onClick={close}
                className="inline-flex h-10 items-center rounded-sm bg-ink px-4 text-sm font-medium text-petal"
              >
                {t.common.shopAll}
              </Link>
            </li>
            {collections.map((c) => (
              <li key={c.href}>
                <Link
                  href={c.href}
                  onClick={close}
                  className={
                    c.emphasis
                      ? "inline-flex h-10 items-center rounded-sm bg-cherry px-4 text-sm font-medium text-white"
                      : "inline-flex h-10 items-center rounded-sm border border-line-strong px-4 text-sm font-medium text-ink"
                  }
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
          {groups.map((g) => (
            <section key={g.href} className="border-t border-line py-3">
              <h3 className="type-title text-xl">
                <Link href={g.href} onClick={close} className="flex min-h-11 items-center hover:text-cherry">
                  {g.title}
                </Link>
              </h3>
              <ul className="grid grid-cols-2 gap-x-4">
                {g.children.map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} onClick={close} className={`${linkClass} text-sm text-ink-soft`}>
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <ul className="border-t border-line pt-3">
            {info.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
            {instagramUrl ? (
              <li>
                <a
                  href={instagramUrl}
                  className={`${linkClass} gap-2`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <InstagramIcon size={18} /> {t.common.instagram}
                  <span className="sr-only"> {t.common.opensNewTab}</span>
                </a>
              </li>
            ) : null}
            <li>
              <LanguageSwitch locale={locale} className="-ms-2 px-2 text-base" />
            </li>
          </ul>
        </nav>
      </Sheet>
    </>
  );
}
