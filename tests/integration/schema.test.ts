import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  closeDb,
  insertCategory,
  insertImage,
  insertProduct,
  resetDb,
  schema,
  testDb,
} from "@tests/helpers/db";

const db = testDb();

/** Postgres errors from drizzle are wrapped; the constraint/code lives on `cause`. */
async function pgError(promise: Promise<unknown>): Promise<{ code?: string; constraint_name?: string }> {
  try {
    await promise;
  } catch (e) {
    const err = e as { cause?: { code?: string; constraint_name?: string }; code?: string };
    return err.cause ?? err;
  }
  throw new Error("Expected the statement to be rejected, but it succeeded");
}

const CHECK = "23514";
const UNIQUE = "23505";

let categoryId: string;

beforeEach(async () => {
  await resetDb();
  categoryId = (await insertCategory(db, { slug: "heels" })).id;
});
afterAll(closeDb);

describe("products constraints", () => {
  it("rejects sale_price >= price", async () => {
    for (const sale of [2000, 2500]) {
      const e = await pgError(insertProduct(db, categoryId, { pricePkr: 2000, salePricePkr: sale }));
      expect(e.code).toBe(CHECK);
      expect(e.constraint_name).toBe("products_sale_price_valid");
    }
  });
  it("accepts a lower sale price and rejects zero sale price", async () => {
    await insertProduct(db, categoryId, { pricePkr: 2000, salePricePkr: 1999 });
    const e = await pgError(insertProduct(db, categoryId, { pricePkr: 2000, salePricePkr: 0 }));
    expect(e.constraint_name).toBe("products_sale_price_valid");
  });
  it("rejects price <= 0", async () => {
    for (const p of [0, -1]) {
      const e = await pgError(insertProduct(db, categoryId, { pricePkr: p }));
      expect(e.constraint_name).toBe("products_price_positive");
    }
  });
  it("rejects invalid stock_status, badge and colour", async () => {
    expect(
      (await pgError(insertProduct(db, categoryId, { stockStatus: "backorder" as never }))).constraint_name,
    ).toBe("products_stock_status_valid");
    expect((await pgError(insertProduct(db, categoryId, { badge: "hot" as never }))).constraint_name).toBe(
      "products_badge_valid",
    );
    expect(
      (await pgError(insertProduct(db, categoryId, { colors: ["red", "neon"] as never }))).constraint_name,
    ).toBe("products_colors_valid");
  });
  it("accepts every documented value", async () => {
    await insertProduct(db, categoryId, {
      stockStatus: "preorder",
      badge: "buy_2_get_1",
      colors: ["red", "multicolor"],
    });
  });
  it.each(["Bad Slug", "UPPER", "-lead", "trail-", "double--dash", "under_score", ""])(
    "enforces slug format: rejects %j",
    async (slug) => {
      const e = await pgError(insertProduct(db, categoryId, { slug, name: "n" }));
      expect(e.constraint_name).toBe("products_slug_format");
    },
  );
  it("rejects duplicate slug", async () => {
    await insertProduct(db, categoryId, { slug: "same" });
    const e = await pgError(insertProduct(db, categoryId, { slug: "same" }));
    expect(e.code).toBe(UNIQUE);
    expect(e.constraint_name).toBe("products_slug_key");
  });
  it("rejects blank name and bad collab partner", async () => {
    expect((await pgError(insertProduct(db, categoryId, { name: "   " }))).constraint_name).toBe(
      "products_name_not_blank",
    );
    expect(
      (await pgError(insertProduct(db, categoryId, { collabPartner: "has space" }))).constraint_name,
    ).toBe("products_collab_partner_format");
  });
  it("auto-generates sequential codes", async () => {
    const a = await insertProduct(db, categoryId);
    const b = await insertProduct(db, categoryId);
    const c = await insertProduct(db, categoryId);
    expect([a.code, b.code, c.code]).toEqual(["USBA-001", "USBA-002", "USBA-003"]);
  });
  it("restricts deleting a category that has products", async () => {
    await insertProduct(db, categoryId);
    const e = await pgError(db.delete(schema.categories).where(eq(schema.categories.id, categoryId)));
    expect(e.code).toBe("23503");
  });
});

describe("categories constraints", () => {
  it.each(["sale", "collab"])("rejects reserved slug %s", async (slug) => {
    const e = await pgError(insertCategory(db, { slug }));
    expect(e.constraint_name).toBe("categories_slug_not_reserved");
  });
  it("enforces slug format and uniqueness", async () => {
    expect((await pgError(insertCategory(db, { slug: "Bad Slug" }))).constraint_name).toBe(
      "categories_slug_format",
    );
    expect((await pgError(insertCategory(db, { slug: "heels" }))).constraint_name).toBe(
      "categories_slug_key",
    );
  });
  it("rejects a category as its own parent", async () => {
    const c = await insertCategory(db, { slug: "loop" });
    const e = await pgError(
      db.update(schema.categories).set({ parentId: c.id }).where(eq(schema.categories.id, c.id)),
    );
    expect(e.constraint_name).toBe("categories_not_own_parent");
  });
});

describe("product_images", () => {
  it("allows positions 0..5 and rejects a 7th image (position 6)", async () => {
    const p = await insertProduct(db, categoryId);
    for (let i = 0; i < 6; i++) await insertImage(db, p.id, i);
    const e = await pgError(insertImage(db, p.id, 6));
    expect(e.constraint_name).toBe("product_images_position_range");
  });
  it("rejects negative position and non-positive dimensions", async () => {
    const p = await insertProduct(db, categoryId);
    expect((await pgError(insertImage(db, p.id, -1))).constraint_name).toBe("product_images_position_range");
    expect((await pgError(insertImage(db, p.id, 0, { width: 0 }))).constraint_name).toBe(
      "product_images_dimensions_positive",
    );
  });
  it("rejects a duplicate position at commit", async () => {
    const p = await insertProduct(db, categoryId);
    await insertImage(db, p.id, 0);
    const e = await pgError(insertImage(db, p.id, 0));
    expect(e.code).toBe(UNIQUE);
    expect(e.constraint_name).toBe("product_images_product_position_key");
  });
  it("checks positions immediately; reorders delete and re-insert (DSQL has no deferrable unique)", async () => {
    const p = await insertProduct(db, categoryId);
    const a = await insertImage(db, p.id, 0);
    const b = await insertImage(db, p.id, 1);
    const swapInPlace = db.transaction(async (tx) => {
      await tx.update(schema.productImages).set({ position: 1 }).where(eq(schema.productImages.id, a.id));
      await tx.update(schema.productImages).set({ position: 0 }).where(eq(schema.productImages.id, b.id));
    });
    expect((await pgError(swapInPlace)).code).toBe(UNIQUE);
    await db.transaction(async (tx) => {
      await tx.delete(schema.productImages).where(eq(schema.productImages.productId, p.id));
      await tx.insert(schema.productImages).values([
        { ...b, position: 0 },
        { ...a, position: 1 },
      ]);
    });
    const rows = await db.select().from(schema.productImages).where(eq(schema.productImages.productId, p.id));
    expect(Object.fromEntries(rows.map((r) => [r.id, r.position]))).toEqual({ [a.id]: 1, [b.id]: 0 });
  });
  it("still rejects a duplicate that remains at transaction commit", async () => {
    const p = await insertProduct(db, categoryId);
    const a = await insertImage(db, p.id, 0);
    await insertImage(db, p.id, 1);
    const e = await pgError(
      db.transaction(async (tx) => {
        await tx.update(schema.productImages).set({ position: 1 }).where(eq(schema.productImages.id, a.id));
      }),
    );
    expect(e.code).toBe(UNIQUE);
  });
  it("same position is fine on different products; storage_key is unique", async () => {
    const p1 = await insertProduct(db, categoryId);
    const p2 = await insertProduct(db, categoryId);
    await insertImage(db, p1.id, 0, { storageKey: "k1" });
    await insertImage(db, p2.id, 0, { storageKey: "k2" });
    const e = await pgError(insertImage(db, p2.id, 1, { storageKey: "k1" }));
    expect(e.constraint_name).toBe("product_images_storage_key_key");
  });
});

describe("product deletion", () => {
  it("cascades images and sizes and nulls order_items.product_id keeping the snapshot", async () => {
    const p = await insertProduct(db, categoryId, { name: "Snap Shoe" });
    await insertImage(db, p.id, 0);
    await db.insert(schema.productSizes).values({ productId: p.id, label: "38" });
    const [order] = await db
      .insert(schema.orders)
      .values({ customerName: "Ayesha", customerPhone: "03001234567" })
      .returning();
    await db.insert(schema.orderItems).values({
      orderId: order!.id,
      productId: p.id,
      productName: "Snap Shoe",
      productCode: p.code,
      unitPricePkr: 2000,
    });
    const [review] = await db
      .insert(schema.reviews)
      .values({ customerName: "A", body: "nice", productId: p.id, source: "admin" })
      .returning();

    await db.delete(schema.products).where(eq(schema.products.id, p.id));

    expect(await db.select().from(schema.productImages)).toHaveLength(0);
    expect(await db.select().from(schema.productSizes)).toHaveLength(0);
    const [item] = await db.select().from(schema.orderItems);
    expect(item).toMatchObject({ productId: null, productName: "Snap Shoe", productCode: "USBA-001" });
    const [rev] = await db.select().from(schema.reviews).where(eq(schema.reviews.id, review!.id));
    expect(rev?.productId).toBeNull();
  });
});

describe("site_settings", () => {
  it("is seeded with exactly one row of id 1", async () => {
    const rows = await db.select().from(schema.siteSettings);
    expect(rows.map((r) => r.id)).toEqual([1]);
  });
  it("rejects any id other than 1", async () => {
    const e = await pgError(db.insert(schema.siteSettings).values({ id: 2 }));
    expect(e.constraint_name).toBe("site_settings_singleton");
  });
  it("rejects a second row with id 1", async () => {
    const e = await pgError(db.insert(schema.siteSettings).values({ id: 1 }));
    expect(e.code).toBe(UNIQUE);
  });
  it("enforces WhatsApp number format", async () => {
    for (const bad of ["+923001234567", "0300123456", "123", "92300abc4567"]) {
      const e = await pgError(
        db.update(schema.siteSettings).set({ whatsappNumber: bad }).where(eq(schema.siteSettings.id, 1)),
      );
      expect(e.constraint_name).toBe("site_settings_whatsapp_format");
    }
    await db.update(schema.siteSettings).set({ whatsappNumber: "923001234567" });
    await db.update(schema.siteSettings).set({ whatsappNumber: "" });
  });
});

describe("orders", () => {
  it("generates ORD-0001 style codes", async () => {
    const mk = () =>
      db
        .insert(schema.orders)
        .values({ customerName: "A", customerPhone: "1" })
        .returning()
        .then((r) => r[0]!);
    expect((await mk()).code).toBe("ORD-0001");
    expect((await mk()).code).toBe("ORD-0002");
  });
  it("enforces status and channel values and non-blank name", async () => {
    const base = { customerName: "A", customerPhone: "1" };
    expect(
      (await pgError(db.insert(schema.orders).values({ ...base, status: "lost" as never }))).constraint_name,
    ).toBe("orders_status_valid");
    expect(
      (await pgError(db.insert(schema.orders).values({ ...base, channel: "fax" as never }))).constraint_name,
    ).toBe("orders_channel_valid");
    expect(
      (await pgError(db.insert(schema.orders).values({ ...base, customerName: " " }))).constraint_name,
    ).toBe("orders_customer_name_not_blank");
  });
  it("accepts all valid statuses and defaults to received", async () => {
    const [o] = await db.insert(schema.orders).values({ customerName: "A", customerPhone: "1" }).returning();
    expect(o?.status).toBe("received");
    for (const status of ["processing", "shipped", "delivered", "cancelled"] as const) {
      await db.update(schema.orders).set({ status }).where(eq(schema.orders.id, o!.id));
    }
  });
  it("order items need positive quantity and non-negative price", async () => {
    const [o] = await db.insert(schema.orders).values({ customerName: "A", customerPhone: "1" }).returning();
    const item = { orderId: o!.id, productName: "x", productCode: "USBA-001", unitPricePkr: 1 };
    expect(
      (await pgError(db.insert(schema.orderItems).values({ ...item, quantity: 0 }))).constraint_name,
    ).toBe("order_items_quantity_positive");
    expect(
      (await pgError(db.insert(schema.orderItems).values({ ...item, unitPricePkr: -1 }))).constraint_name,
    ).toBe("order_items_price_non_negative");
  });
});

describe("reviews", () => {
  const base = { customerName: "Sara", body: "Loved it", source: "customer" as const };
  it("accepts rating 1..5 and null", async () => {
    for (const rating of [1, 5, null]) await db.insert(schema.reviews).values({ ...base, rating });
  });
  it("rejects rating 0 and 6", async () => {
    for (const rating of [0, 6]) {
      const e = await pgError(db.insert(schema.reviews).values({ ...base, rating }));
      expect(e.constraint_name).toBe("reviews_rating_range");
    }
  });
  it("defaults to pending and validates status/source/lengths", async () => {
    const [r] = await db.insert(schema.reviews).values(base).returning();
    expect(r?.status).toBe("pending");
    expect(
      (await pgError(db.insert(schema.reviews).values({ ...base, status: "spam" as never }))).constraint_name,
    ).toBe("reviews_status_valid");
    expect(
      (await pgError(db.insert(schema.reviews).values({ ...base, source: "bot" as never }))).constraint_name,
    ).toBe("reviews_source_valid");
    expect((await pgError(db.insert(schema.reviews).values({ ...base, body: "" }))).constraint_name).toBe(
      "reviews_body_length",
    );
    expect(
      (await pgError(db.insert(schema.reviews).values({ ...base, body: "x".repeat(2001) }))).constraint_name,
    ).toBe("reviews_body_length");
    expect(
      (await pgError(db.insert(schema.reviews).values({ ...base, customerName: "n".repeat(81) })))
        .constraint_name,
    ).toBe("reviews_customer_name_length");
  });
});
