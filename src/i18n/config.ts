/**
 * Locales (CS-15). English is the default and keeps unprefixed URLs
 * (/shop/heels); Urdu lives under /ur (/ur/shop/heels). Internally every
 * storefront route is under app/[lang], and src/proxy.ts rewrites
 * unprefixed paths to /en/... so both locales are statically prerendered.
 */
export const LOCALES = ["en", "ur"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_META: Record<
  Locale,
  { dir: "ltr" | "rtl"; htmlLang: string; label: string; ogLocale: string }
> = {
  en: { dir: "ltr", htmlLang: "en", label: "English", ogLocale: "en_PK" },
  ur: { dir: "rtl", htmlLang: "ur", label: "اردو", ogLocale: "ur_PK" },
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Public URL path for a locale: "/shop" → "/ur/shop" (Urdu) or "/shop" (English). */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/** Strip a locale prefix from a public pathname: "/ur/shop" → { locale: "ur", path: "/shop" }. */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const match = /^\/(ur)(\/.*)?$/.exec(pathname);
  if (match) return { locale: match[1] as Locale, path: match[2] || "/" };
  return { locale: DEFAULT_LOCALE, path: pathname || "/" };
}

/** hreflang alternates for metadata: { en: "/shop", ur: "/ur/shop", "x-default": "/shop" }. */
export function languageAlternates(path: string): Record<string, string> {
  return {
    en: localePath("en", path),
    ur: localePath("ur", path),
    "x-default": localePath("en", path),
  };
}

/** Localize an admin-entered link: site-relative paths get the locale prefix; external URLs are unchanged. */
export function localizeHref(locale: Locale, href: string): string {
  return href.startsWith("/") && !href.startsWith("//") ? localePath(locale, href) : href;
}

/** Public path for the same page in another locale. */
export function switchLocalePath(pathname: string, target: Locale): string {
  const { path } = splitLocale(pathname.replace(/^\/en(?=\/|$)/, "") || "/");
  return localePath(target, path);
}

/** Metadata `alternates` for a page: self canonical in this locale + hreflang for every locale. */
export function pageAlternates(
  locale: Locale,
  path: string,
): { canonical: string; languages: Record<string, string> } {
  return { canonical: localePath(locale, path), languages: languageAlternates(path) };
}
