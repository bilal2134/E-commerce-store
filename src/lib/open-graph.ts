import type { Metadata } from "next";
import { LOCALE_META, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type OpenGraph = NonNullable<Metadata["openGraph"]>;

/** Default share image: the owner's logo on cherry (pnpm brand:assets). */
export const DEFAULT_SHARE_IMAGE = {
  url: "/brand/usba-share.png",
  width: 1200,
  height: 630,
  alt: "USBA",
} as const;

/**
 * Site-wide Open Graph fields. Next replaces `openGraph` wholesale when a page
 * sets it, so pages spread this in rather than relying on the layout's copy.
 */
export function baseOpenGraph(locale: Locale, t: Dictionary): OpenGraph {
  return {
    siteName: t.meta.siteName,
    type: "website",
    locale: LOCALE_META[locale].ogLocale,
    images: [DEFAULT_SHARE_IMAGE],
  };
}
