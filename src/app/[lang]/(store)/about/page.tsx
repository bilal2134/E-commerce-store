import type { Metadata, Route } from "next";
import { localePath, pageAlternates } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { getSettings } from "@/server/catalog/public";
import { ButtonLink } from "@/components/ui/button";
import { TruckIcon } from "@/components/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    title: t.about.title,
    description: t.about.metaDescription,
    alternates: pageAlternates(locale, "/about"),
  };
}

export default async function AboutPage() {
  const [settings, { locale, t }] = await Promise.all([getSettings(), getI18n()]);
  const paragraphs = settings.aboutBody
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className="container-page pt-6 md:pt-10">
      <div className="max-w-2xl">
        <h1 className="type-display text-[2.5rem] leading-none md:text-6xl">{t.about.title}</h1>
        <div className="prose-body mt-6 text-lg text-ink-soft">
          {paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        {settings.deliverySummary ? (
          <section aria-labelledby="delivery-title" className="mt-10 border-t border-line pt-8">
            <h2 id="delivery-title" className="flex items-center gap-2 text-base font-semibold">
              <TruckIcon size={18} className="text-cherry" />
              {settings.deliverySummary}
            </h2>
            {settings.deliveryDetails ? (
              <p className="mt-2 text-ink-soft">{settings.deliveryDetails}</p>
            ) : null}
          </section>
        ) : null}
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href={localePath(locale, "/shop") as Route} size="lg">
            {t.about.shopCollection}
          </ButtonLink>
          <ButtonLink href={localePath(locale, "/contact") as Route} variant="secondary" size="lg">
            {t.about.contact}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
