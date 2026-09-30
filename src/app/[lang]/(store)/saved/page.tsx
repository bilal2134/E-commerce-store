import type { Metadata } from "next";
import { localePath } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { getSettings } from "@/server/catalog/public";
import { SavedView } from "@/components/store/saved/saved-view";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    title: t.saved.metaTitle,
    robots: { index: false, follow: true },
    alternates: { canonical: localePath(locale, "/saved") },
  };
}

/** Saved list (CS-21): lives in this browser; shareable by link. Rendered client-side. */
export default async function SavedPage() {
  const [settings, { locale, t }] = await Promise.all([getSettings(), getI18n()]);
  return (
    <div className="container-page pt-6 pb-4 md:pt-10">
      <h1 className="type-display text-[2.5rem] leading-none md:text-6xl">{t.saved.title}</h1>
      <SavedView whatsappNumber={settings.whatsappNumber} locale={locale} />
    </div>
  );
}
