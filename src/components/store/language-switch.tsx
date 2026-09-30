"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LOCALE_META, switchLocalePath, type Locale } from "@/i18n/config";
import { dictionaryFor } from "@/i18n/dictionaries";
import { cn } from "@/lib/cn";

/**
 * Link to the same page in the other language (CS-15). Server-renders a link
 * to the other locale's homepage, then points at the current page once
 * hydrated (the layout can't know the path during prerendering). Search
 * engines get per-page alternates from hreflang metadata instead.
 */
export function LanguageSwitch({ locale, className }: { locale: Locale; className?: string }) {
  const target: Locale = locale === "ur" ? "en" : "ur";
  const t = dictionaryFor(locale);
  const pathname = usePathname();
  const [href, setHref] = useState(target === "ur" ? "/ur" : "/");
  useEffect(() => {
    // window.location is the public URL (unaffected by the internal /en rewrite).
    const update = () => setHref(switchLocalePath(window.location.pathname, target) + window.location.search);
    update();
    window.addEventListener("popstate", update);
    window.addEventListener("usba:search-change", update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("usba:search-change", update);
    };
  }, [target, pathname]);

  return (
    // Full navigation on purpose: the other locale has its own root layout (lang/dir).
    <a
      href={href}
      hrefLang={LOCALE_META[target].htmlLang}
      lang={LOCALE_META[target].htmlLang}
      aria-label={t.common.languageSwitchLabel}
      className={cn(
        "inline-flex h-11 items-center rounded-sm px-2 text-sm font-medium text-ink hover:bg-blush",
        className,
      )}
    >
      {t.common.languageSwitch}
    </a>
  );
}
