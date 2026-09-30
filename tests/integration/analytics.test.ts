import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getInsights } from "@/server/admin/insights";
import { pruneAnalyticsEvents, recordEvent } from "@/server/analytics/collect";
import { closeDb, insertCategory, insertProduct, resetDb, schema, testDb } from "@tests/helpers/db";

const db = testDb();

beforeEach(resetDb);
afterAll(closeDb);

describe("recordEvent", () => {
  it("resolves product code and slug to product_id, and drops unknown targets", async () => {
    const cat = await insertCategory(db, { slug: "heels" });
    const p = await insertProduct(db, cat.id, { slug: "stiletto" });
    expect(await recordEvent(db, { type: "product_view", productCode: p.code }, "h1")).toBe(true);
    expect(await recordEvent(db, { type: "whatsapp_order_click", productSlug: "stiletto" }, "h1")).toBe(true);
    expect(await recordEvent(db, { type: "product_view", productCode: "USBA-999" }, "h1")).toBe(false);
    expect(await recordEvent(db, { type: "category_view", categorySlug: "nope" }, "h1")).toBe(false);
    expect(await recordEvent(db, { type: "category_view", categorySlug: "sale" }, "h1")).toBe(true);
    // search with unknown product still stores a row with a null product
    expect(await recordEvent(db, { type: "search", productCode: "USBA-999" }, "h1")).toBe(true);
    const rows = await db.select().from(schema.analyticsEvents).orderBy(schema.analyticsEvents.id);
    expect(rows.map((r) => [r.type, r.productId])).toEqual([
      ["product_view", p.id],
      ["whatsapp_order_click", p.id],
      ["category_view", null],
      ["search", null],
    ]);
  });

  it("sets product_id to null when the product is deleted", async () => {
    const cat = await insertCategory(db);
    const p = await insertProduct(db, cat.id);
    await recordEvent(db, { type: "whatsapp_order_click", productCode: p.code }, "h1");
    await db.delete(schema.products);
    const [row] = await db.select().from(schema.analyticsEvents);
    expect(row?.productId).toBeNull();
  });

  it("stores one row per visitor, event and target per day", async () => {
    const cat = await insertCategory(db, { slug: "heels" });
    const p = await insertProduct(db, cat.id);
    expect(await recordEvent(db, { type: "product_view", productCode: p.code }, "h1")).toBe(true);
    expect(await recordEvent(db, { type: "product_view", productCode: p.code }, "h1")).toBe(false);
    expect(await recordEvent(db, { type: "search" }, "h1")).toBe(true);
    expect(await recordEvent(db, { type: "search" }, "h1")).toBe(false);
    expect(await recordEvent(db, { type: "product_view", productCode: p.code }, "h2")).toBe(true);
    expect(await db.$count(schema.analyticsEvents)).toBe(3);
  });

  it("rejects unknown event types at the database", async () => {
    await expect(
      db.execute(sql`insert into analytics_events (type, visitor_day_hash) values ('bogus', 'x')`),
    ).rejects.toThrow();
  });
});

describe("getInsights", () => {
  it("returns an empty state with zero-filled series", async () => {
    const data = await getInsights(db);
    expect(data.hasData).toBe(false);
    expect(data.visitorsByDay).toHaveLength(14);
    expect(data.topProducts).toEqual([]);
  });

  it("aggregates visitors, top products and top-level category breakdown", async () => {
    const shoes = await insertCategory(db, { slug: "shoes", name: "Shoes" });
    const heels = await insertCategory(db, { slug: "heels-x", name: "Heels", parentId: shoes.id });
    const bags = await insertCategory(db, { slug: "bags", name: "Bags" });
    const a = await insertProduct(db, heels.id, { name: "Alpha" });
    const b = await insertProduct(db, bags.id, { name: "Beta" });

    await recordEvent(db, { type: "product_view", productCode: a.code }, "v1");
    await recordEvent(db, { type: "product_view", productCode: a.code }, "v2");
    await recordEvent(db, { type: "product_view", productCode: b.code }, "v1");
    await recordEvent(db, { type: "category_view", categorySlug: "heels-x" }, "v3");
    await recordEvent(db, { type: "category_view", categorySlug: "bags" }, "v3");
    await recordEvent(db, { type: "whatsapp_order_click", productCode: a.code }, "v2");
    await recordEvent(db, { type: "instagram_order_click", productCode: b.code }, "v1");
    // an old event outside the 30-day window, and a second-day visit by v1
    await db.execute(
      sql`insert into analytics_events (type, product_id, visitor_day_hash, created_at, day)
          values ('product_view', ${b.id}, 'old', now() - interval '45 days', ((now() - interval '45 days') at time zone 'utc')::date),
                 ('product_view', ${b.id}, 'v1', now() - interval '2 days', ((now() - interval '2 days') at time zone 'utc')::date)`,
    );

    const data = await getInsights(db);
    expect(data.hasData).toBe(true);
    expect(data.uniqueVisitors).toBe(4); // v1, v2, v3 today + v1 two days ago
    expect(data.productViews).toBe(4);
    expect(data.whatsappClicks).toBe(1);
    expect(data.instagramClicks).toBe(1);
    expect(data.topProducts.map((p) => [p.name, p.views])).toEqual([
      ["Alpha", 2],
      ["Beta", 2],
    ]);
    // Shoes: 2 (Alpha views) + 1 (heels category view); Bags: 2 product views + 1 category view
    expect(data.categories.map((c) => [c.name, c.views])).toEqual([
      ["Bags", 3],
      ["Shoes", 3],
    ]);
    expect(data.visitorsByDay.reduce((n, d) => n + d.visitors, 0)).toBe(4);
    expect(data.visitorsByDay.at(-1)?.visitors).toBe(3);
  });
});

describe("pruneAnalyticsEvents", () => {
  it("removes events older than 180 days only", async () => {
    await db.execute(
      sql`insert into analytics_events (type, visitor_day_hash, created_at)
          values ('search', 'a', now() - interval '181 days'), ('search', 'b', now() - interval '10 days')`,
    );
    await pruneAnalyticsEvents(db);
    const rows = await db.select().from(schema.analyticsEvents);
    expect(rows.map((r) => r.visitorDayHash)).toEqual(["b"]);
  });
});
