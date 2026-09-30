import Link from "next/link";
import type { Route } from "next";
import { EmptyState, Panel } from "@/components/admin/ui";
import type { InsightsData } from "@/server/admin/insights";

const nf = new Intl.NumberFormat("en-PK");

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(value > 0 ? 2 : 0, Math.round((value / max) * 100)) : 0;
  return (
    <span aria-hidden="true" className="block h-2.5 w-full rounded-full bg-blush">
      <span className="block h-full rounded-full bg-cherry" style={{ width: `${pct}%` }} />
    </span>
  );
}

function shortDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function InsightsPanel({ data }: { data: InsightsData }) {
  const stats = [
    { label: "Unique visitors", value: data.uniqueVisitors },
    { label: "Product views", value: data.productViews },
    { label: "WhatsApp order clicks", value: data.whatsappClicks },
    { label: "Instagram DM clicks", value: data.instagramClicks },
  ];
  const maxDay = Math.max(0, ...data.visitorsByDay.map((d) => d.visitors));
  const maxCat = Math.max(0, ...data.categories.map((c) => c.views));

  return (
    <section aria-labelledby="insights-heading" className="mt-10">
      <h2 id="insights-heading" className="type-title text-2xl">
        Insights (last {data.windowDays} days)
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted">
        First-party, cookie-free counts. Connect Google Analytics or Plausible for more.
      </p>

      {!data.hasData ? (
        <EmptyState title="No visits recorded yet">
          Visits to your shop will show up here once customers start browsing.
        </EmptyState>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-sm border border-line bg-surface p-4">
                <dt className="text-sm text-ink-soft">{s.label}</dt>
                <dd className="mt-1 text-3xl font-semibold tabular-nums">{nf.format(s.value)}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Visitors per day" description="Last 14 days (UTC)">
              <table className="w-full text-sm">
                <caption className="sr-only">Unique visitors per day, last 14 days</caption>
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Day</th>
                    <th scope="col">Chart</th>
                    <th scope="col">Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {data.visitorsByDay.map((d) => (
                    <tr key={d.day}>
                      <th scope="row" className="w-16 py-1 pe-3 text-start font-normal text-ink-soft">
                        {shortDay(d.day)}
                      </th>
                      <td className="py-1">
                        <Bar value={d.visitors} max={maxDay} />
                      </td>
                      <td className="w-10 py-1 ps-3 text-end tabular-nums">{d.visitors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <div className="space-y-6">
              <Panel title="Top viewed products">
                {data.topProducts.length === 0 ? (
                  <p className="text-sm text-muted">No product views yet.</p>
                ) : (
                  <ol className="-my-2 divide-y divide-line">
                    {data.topProducts.map((p, i) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${p.id}` as Route}
                            className="font-medium hover:text-cherry hover:underline"
                          >
                            <span className="text-muted tabular-nums">{i + 1}. </span>
                            {p.name}
                          </Link>
                          <span className="text-sm text-muted"> · {p.code}</span>
                        </div>
                        <span className="text-sm whitespace-nowrap text-ink-soft tabular-nums">
                          {nf.format(p.views)} {p.views === 1 ? "view" : "views"}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>

              <Panel title="Category breakdown" description="Product and category page views">
                {data.categories.length === 0 ? (
                  <p className="text-sm text-muted">No category views yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <caption className="sr-only">Views per category</caption>
                    <thead className="sr-only">
                      <tr>
                        <th scope="col">Category</th>
                        <th scope="col">Chart</th>
                        <th scope="col">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.categories.map((c) => (
                        <tr key={c.slug}>
                          <th scope="row" className="w-28 py-1.5 pe-3 text-start font-normal">
                            {c.name}
                          </th>
                          <td className="py-1.5">
                            <Bar value={c.views} max={maxCat} />
                          </td>
                          <td className="w-12 py-1.5 ps-3 text-end tabular-nums">{nf.format(c.views)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
