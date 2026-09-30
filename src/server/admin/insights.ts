import "server-only";
import { sql } from "drizzle-orm";
import type { Database } from "../db/client";

/** First-party, cookie-free insights for the admin dashboard (AS-19). All days are UTC. */

export interface InsightsData {
  windowDays: number;
  /** Sum over days of distinct daily visitor hashes (one person on two days counts twice). */
  uniqueVisitors: number;
  productViews: number;
  whatsappClicks: number;
  instagramClicks: number;
  /** Last 14 days, oldest first, zero-filled. */
  visitorsByDay: { day: string; visitors: number }[];
  topProducts: { id: string; name: string; code: string; views: number }[];
  /** Views per top-level category (product views + category page views). */
  categories: { slug: string; name: string; views: number }[];
  hasData: boolean;
}

const WINDOW_DAYS = 30;
const SERIES_DAYS = 14;

export async function getInsights(database: Database): Promise<InsightsData> {
  const since = sql`(now() - make_interval(days => ${WINDOW_DAYS}))`;

  const [totals, series, top, cats] = await Promise.all([
    database.execute<{ visitors: number; views: number; whatsapp: number; instagram: number }>(sql`
      select
        (select count(*) from (
          select distinct (created_at at time zone 'UTC')::date, visitor_day_hash
          from analytics_events where created_at >= ${since}
        ) d)::int as visitors,
        (count(*) filter (where type = 'product_view'))::int as views,
        (count(*) filter (where type = 'whatsapp_order_click'))::int as whatsapp,
        (count(*) filter (where type = 'instagram_order_click'))::int as instagram
      from analytics_events where created_at >= ${since}
    `),
    database.execute<{ day: string; visitors: number }>(sql`
      select to_char(g.day, 'YYYY-MM-DD') as day, coalesce(v.visitors, 0)::int as visitors
      from generate_series(
        (now() at time zone 'UTC')::date - (${SERIES_DAYS - 1})::int,
        (now() at time zone 'UTC')::date,
        interval '1 day'
      ) as g(day)
      left join (
        select (created_at at time zone 'UTC')::date as day, count(distinct visitor_day_hash) as visitors
        from analytics_events where created_at >= now() - interval '15 days' group by 1
      ) v on v.day = g.day::date
      order by g.day
    `),
    database.execute<{ id: string; name: string; code: string; views: number }>(sql`
      select p.id, p.name, p.code, count(*)::int as views
      from analytics_events e
      join products p on p.id = e.product_id
      where e.type = 'product_view' and e.created_at >= ${since}
      group by p.id, p.name, p.code
      order by views desc, p.name asc
      limit 5
    `),
    database.execute<{ slug: string; name: string; views: number }>(sql`
      select root.slug, root.name, sum(x.n)::int as views
      from (
        select p.category_id as category_id, count(*) as n
        from analytics_events e join products p on p.id = e.product_id
        where e.type = 'product_view' and e.created_at >= ${since}
        group by p.category_id
        union all
        select c.id as category_id, count(*) as n
        from analytics_events e join categories c on c.slug = e.category_slug
        where e.type = 'category_view' and e.created_at >= ${since}
        group by c.id
      ) x
      join categories c on c.id = x.category_id
      join categories root on root.id = coalesce(c.parent_id, c.id)
      group by root.id, root.slug, root.name
      order by views desc, root.name asc
    `),
  ]);

  const t = totals[0];
  const uniqueVisitors = Number(t?.visitors ?? 0);
  const visitorsByDay = [...series].map((r) => ({ day: r.day, visitors: Number(r.visitors) }));
  return {
    windowDays: WINDOW_DAYS,
    uniqueVisitors,
    productViews: Number(t?.views ?? 0),
    whatsappClicks: Number(t?.whatsapp ?? 0),
    instagramClicks: Number(t?.instagram ?? 0),
    visitorsByDay,
    topProducts: [...top].map((r) => ({ id: r.id, name: r.name, code: r.code, views: Number(r.views) })),
    categories: [...cats].map((r) => ({ slug: r.slug, name: r.name, views: Number(r.views) })),
    hasData: uniqueVisitors > 0,
  };
}
