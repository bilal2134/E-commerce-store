import type { Metadata } from "next";
import { getSettings } from "@/server/catalog/public";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Size guide",
  description: "USBA footwear size chart: EU, UK and US sizes with foot length in centimetres.",
  alternates: { canonical: "/size-guide" },
};

/** CS-13: footwear size chart. */
export default async function SizeGuidePage() {
  const settings = await getSettings();
  return (
    <div className="container-page pt-6 md:pt-10">
      <div className="max-w-3xl">
        <h1 className="type-display text-[2.5rem] leading-none md:text-6xl">Size guide</h1>
        <p className="mt-4 text-base text-ink-soft">
          Footwear is listed in EU sizes. Compare with UK and US sizes, or measure your foot.
        </p>

        {settings.sizeChart.length ? (
          <div
            className="mt-8 overflow-x-auto border border-line bg-surface"
            role="region"
            aria-label="Size chart"
            tabIndex={0}
          >
            <table className="w-full min-w-[28rem] text-left text-sm">
              <caption className="sr-only">Footwear size conversion</caption>
              <thead className="bg-blush text-ink">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    EU
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    UK
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    US women&apos;s
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Foot length (cm)
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
          <p className="mt-8 text-ink-soft">The size chart is being updated. Message us for sizing help.</p>
        )}

        <section aria-labelledby="measure-title" className="mt-10">
          <h2 id="measure-title" className="type-title text-2xl">
            How to measure
          </h2>
          <p className="prose-body mt-3 text-ink-soft">
            {settings.sizeGuideNote ||
              "Stand on a sheet of paper and mark the tip of your longest toe and the back of your heel. Measure the distance in centimetres and compare it with the chart."}
          </p>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/shop/footwear" size="lg">
            Shop footwear
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary" size="lg">
            Ask about sizing
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
