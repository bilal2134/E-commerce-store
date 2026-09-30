import type { Metadata } from "next";
import { getSettings } from "@/server/catalog/public";
import { SavedView } from "@/components/store/saved/saved-view";

export const metadata: Metadata = {
  title: "Saved items",
  robots: { index: false, follow: true },
  alternates: { canonical: "/saved" },
};

/** Saved list (CS-21): lives in this browser; shareable by link. Rendered client-side. */
export default async function SavedPage() {
  const settings = await getSettings();
  return (
    <div className="container-page pt-6 pb-4 md:pt-10">
      <h1 className="type-display text-[2.5rem] leading-none md:text-6xl">Saved</h1>
      <SavedView whatsappNumber={settings.whatsappNumber} />
    </div>
  );
}
