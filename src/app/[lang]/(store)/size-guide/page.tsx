import type { Metadata, Route } from "next";
import { localePath, pageAlternates } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { getLocalizedSettings } from "@/server/catalog/public";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    title: t.sizeGuide.title,
    description: t.sizeGuide.metaDescription,
    alternates: pageAlternates(locale, "/size-guide"),
  };
}

/** CS-13: footwear size chart. */
export default async function SizeGuidePage() {
  const [settings, { locale, t }] = await Promise.all([getLocalizedSettings(), getI18n()]);
  return (
    <div className="container-page pt-6 md:pt-10">
      <div className="max-w-3xl">
        <h1 className="type-display text-[2.5rem] leading-none md:text-6xl">{t.sizeGuide.title}</h1>
        <p className="mt-4 text-base text-ink-soft">{t.sizeGuide.intro}</p>

        {settings.sizeChart.length ? (
          <div
            className="mt-8 overflow-x-auto border border-line bg-surface"
            role="region"
            aria-label={t.sizeGuide.chart}
            tabIndex={0}
          >
            <table className="w-full min-w-[28rem] text-left text-sm">
              <caption className="sr-only">{t.sizeGuide.caption}</caption>
              <thead className="bg-blush text-ink">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    EU
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    UK
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.sizeGuide.usWomens}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.sizeGuide.footLength}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {settings.sizeChart.map((row) => (
                  <tr key={row.eu}>
                    <th scope="row" className="px-4 py-3 font-semibold text-ink">
                      {row.eu}
                    </th>
                    <td className="px-4 py-3 text-ink-soft">{row.uk}</td>
                    <td className="px-4 py-3 text-ink-soft">{row.us}</td>
                    <td className="px-4 py-3 text-ink-soft">{row.footLengthCm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-8 text-ink-soft">{t.sizeGuide.updating}</p>
        )}

        <section aria-labelledby="measure-title" className="mt-10">
          <h2 id="measure-title" className="type-title text-2xl">
            {t.sizeGuide.howToMeasure}
          </h2>
          <p className="prose-body mt-3 text-ink-soft">
            {settings.sizeGuideNote || t.sizeGuide.measureDefault}
          </p>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href={localePath(locale, "/shop/footwear") as Route} size="lg">
            {t.sizeGuide.shopFootwear}
          </ButtonLink>
          <ButtonLink href={localePath(locale, "/contact") as Route} variant="secondary" size="lg">
            {t.sizeGuide.askSizing}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
