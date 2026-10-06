import type { Metadata, Viewport } from "next";
import { preconnect } from "react-dom";
import { LOCALE_META, LOCALES } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { baseOpenGraph } from "@/lib/open-graph";
import { env } from "@/server/config/env";
import { bodoni, hanken } from "../fonts";
import "../globals.css";

/** Both locales are prerendered; English is served at unprefixed URLs via src/proxy.ts. */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    metadataBase: new URL(env().SITE_URL),
    title: { default: t.meta.defaultTitle, template: `%s | ${t.meta.siteName}` },
    description: t.meta.defaultDescription,
    applicationName: t.meta.siteName,
    openGraph: baseOpenGraph(locale, t),
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
    // Search engine ownership checks (public tokens, shown in the HTML anyway).
    verification: { other: { "msvalidate.01": BING_SITE_VERIFICATION } },
  };
}

/** Bing Webmaster Tools, usbaofficial.com.pk (owner's account, 2026-10-07). */
const BING_SITE_VERIFICATION = "02DC62761D7587701E39865FD4F3C91C";

export const viewport: Viewport = {
  themeColor: "#fbf6f7",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleRootLayout({ children }: LayoutProps<"/[lang]">) {
  const { locale } = await getI18n();
  const meta = LOCALE_META[locale];
  // Product photos come from the media origin (bucket/CDN): open the
  // connection early so the LCP image isn't waiting on DNS/TLS.
  preconnect(new URL(env().MEDIA_BASE_URL).origin);
  return (
    <html lang={meta.htmlLang} dir={meta.dir} className={`${bodoni.variable} ${hanken.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
