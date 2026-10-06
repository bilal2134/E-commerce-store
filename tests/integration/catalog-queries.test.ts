import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  fetchApprovedReviews,
  fetchCatalog,
  fetchSettingsRow,
  fetchVisibleProductBySlug,
  fetchVisibleProductCards,
  fetchVisibleSlugByCode,
  toPublicSettings,
  type QueryContext,
} from "@/server/catalog/queries";
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
const ctx: QueryContext = { db, mediaUrl: (key) => `https://media.test/${key}` };

let footwearId: string;
let heelsId: string;

beforeEach(async () => {
  await resetDb();
  footwearId = (await insertCategory(db, { slug: "footwear", name: "Footwear", position: 0 })).id;
  heelsId = (await insertCategory(db, { slug: "heels", name: "Heels", parentId: footwearId })).id;
});
afterAll(closeDb);

describe("fetchVisibleProductCards / fetchCatalog", () => {
  it("returns only visible products", async () => {
    await insertProduct(db, heelsId, { slug: "shown", isVisible: true });
    await insertProduct(db, heelsId, { slug: "hidden", isVisible: false });
    const cards = await fetchVisibleProductCards(ctx);
    expect(cards.map((c) => c.slug)).toEqual(["shown"]);
  });

  it("returns [] when nothing is visible", async () => {
    await insertProduct(db, heelsId, { isVisible: false });
    expect(await fetchVisibleProductCards(ctx)).toEqual([]);
  });

  it("maps the first two images by position with media URLs", async () => {
    const p = await insertProduct(db, heelsId, { slug: "with-imgs", name: "Cherry Heel" });
    await insertImage(db, p.id, 2, { storageKey: "products/third" });
    await insertImage(db, p.id, 1, { storageKey: "products/second", alt: "Side view", widths: [640, 320] });
    await insertImage(db, p.id, 0, { storageKey: "products/first", blurDataUrl: "data:blur" });
    const [card] = await fetchVisibleProductCards(ctx);
    expect(card?.image).toMatchObject({
      baseUrl: "https://media.test/products/first",
      widths: [320, 640],
      width: 800,
      height: 1000,
      alt: "Cherry Heel",
      blurDataUrl: "data:blur",
    });
    expect(card?.hoverImage).toMatchObject({
      baseUrl: "https://media.test/products/second",
      widths: [320, 640],
      alt: "Side view",
    });
  });

  it("has null images for products without any and null hover with one", async () => {
    const none = await insertProduct(db, heelsId, { slug: "none" });
    const one = await insertProduct(db, heelsId, { slug: "one" });
    await insertImage(db, one.id, 0);
    const cards = await fetchVisibleProductCards(ctx);
    const bySlug = Object.fromEntries(cards.map((c) => [c.slug, c]));
    expect(bySlug[none.slug]?.image).toBeNull();
    expect(bySlug["one"]?.image).not.toBeNull();
    expect(bySlug["one"]?.hoverImage).toBeNull();
  });

  it("derives rootCategorySlug from the parent (or itself for roots)", async () => {
    await insertProduct(db, heelsId, { slug: "in-child" });
    await insertProduct(db, footwearId, { slug: "in-root" });
    const cards = await fetchVisibleProductCards(ctx);
    const by = Object.fromEntries(cards.map((c) => [c.slug, c]));
    expect(by["in-child"]).toMatchObject({ categorySlug: "heels", rootCategorySlug: "footwear" });
    expect(by["in-root"]).toMatchObject({ categorySlug: "footwear", rootCategorySlug: "footwear" });
  });

  it("serialises fields (createdAt ISO, colours, badge, sale)", async () => {
    await insertProduct(db, heelsId, {
      pricePkr: 3000,
      salePricePkr: 2000,
      badge: "sale",
      colors: ["red", "pink"],
      collabPartner: "fairycoreforher",
      featuredRank: 3,
    });
    const [c] = await fetchVisibleProductCards(ctx);
    expect(c).toMatchObject({
      pricePkr: 3000,
      salePricePkr: 2000,
      badge: "sale",
      colors: ["red", "pink"],
      collabPartner: "fairycoreforher",
      featuredRank: 3,
      stockStatus: "in_stock",
    });
    expect(new Date(c!.createdAt).toISOString()).toBe(c!.createdAt);
  });

  it("orders newest first and fetchCatalog builds the category tree", async () => {
    const a = await insertProduct(db, heelsId, { slug: "older" });
    await db
      .update(schema.products)
      .set({ createdAt: new Date("2020-01-01") })
      .where(eq(schema.products.id, a.id));
    await insertProduct(db, heelsId, { slug: "newer" });
    const catalog = await fetchCatalog(ctx);
    expect(catalog.products.map((p) => p.slug)).toEqual(["newer", "older"]);
    expect(catalog.categories).toHaveLength(1);
    expect(catalog.categories[0]?.slug).toBe("footwear");
    expect(catalog.categories[0]?.children.map((c) => c.slug)).toEqual(["heels"]);
  });
});

describe("fetchVisibleProductBySlug", () => {
  it("returns null for hidden and unknown products", async () => {
    await insertProduct(db, heelsId, { slug: "secret", isVisible: false });
    expect(await fetchVisibleProductBySlug(ctx, "secret")).toBeNull();
    expect(await fetchVisibleProductBySlug(ctx, "missing")).toBeNull();
  });

  it("includes ordered images, sizes and root category info", async () => {
    const p = await insertProduct(db, heelsId, {
      slug: "detail",
      name: "Detail Heel",
      description: "Lovely",
    });
    await insertImage(db, p.id, 1, { storageKey: "products/b", alt: "" });
    await insertImage(db, p.id, 0, { storageKey: "products/a", alt: "Front" });
    await db.insert(schema.productSizes).values([
      { productId: p.id, label: "40", position: 2 },
      { productId: p.id, label: "38", position: 0 },
      { productId: p.id, label: "39", position: 1, isAvailable: false },
    ]);
    const detail = await fetchVisibleProductBySlug(ctx, "detail");
    expect(detail).toMatchObject({
      name: "Detail Heel",
      description: "Lovely",
      rootCategorySlug: "footwear",
      rootCategoryName: "Footwear",
      categorySlug: "heels",
    });
    expect(detail?.images.map((i) => i.baseUrl)).toEqual([
      "https://media.test/products/a",
      "https://media.test/products/b",
    ]);
    expect(detail?.images[0]?.alt).toBe("Front");
    expect(detail?.images[1]?.alt).toBe("Detail Heel — photo 2 of 2");
    expect(detail?.image).toEqual(detail?.images[0]);
    expect(detail?.hoverImage).toEqual(detail?.images[1]);
    expect(detail?.sizes).toEqual([
      { label: "38", isAvailable: true, remaining: null },
      { label: "39", isAvailable: false, remaining: null },
      { label: "40", isAvailable: true, remaining: null },
    ]);
  });
});

describe("fetchVisibleSlugByCode", () => {
  it("looks up case-insensitively", async () => {
    const p = await insertProduct(db, heelsId, { slug: "coded" });
    expect(p.code).toBe("USBA-001");
    expect(await fetchVisibleSlugByCode(ctx, "USBA-001")).toBe("coded");
    expect(await fetchVisibleSlugByCode(ctx, "usba-001")).toBe("coded");
    expect(await fetchVisibleSlugByCode(ctx, "USBA-999")).toBeNull();
  });
  it("returns null for hidden products", async () => {
    await insertProduct(db, heelsId, { slug: "hid", isVisible: false });
    expect(await fetchVisibleSlugByCode(ctx, "USBA-001")).toBeNull();
  });
});

describe("fetchApprovedReviews", () => {
  it("excludes pending and rejected reviews", async () => {
    const base = { customerName: "X", source: "customer" as const };
    await db.insert(schema.reviews).values([
      { ...base, body: "approved", status: "approved" },
      { ...base, body: "pending", status: "pending" },
      { ...base, body: "rejected", status: "rejected" },
    ]);
    const list = await fetchApprovedReviews(ctx);
    expect(list.map((r) => r.body)).toEqual(["approved"]);
  });

  it("links visible products and hides links to hidden ones", async () => {
    const visible = await insertProduct(db, heelsId, { slug: "vis", name: "Vis" });
    const hidden = await insertProduct(db, heelsId, { slug: "hid", name: "Hid", isVisible: false });
    const base = { customerName: "X", source: "admin" as const, status: "approved" as const };
    await db.insert(schema.reviews).values([
      { ...base, body: "on visible", productId: visible.id },
      { ...base, body: "on hidden", productId: hidden.id },
      { ...base, body: "standalone" },
    ]);
    const by = Object.fromEntries((await fetchApprovedReviews(ctx)).map((r) => [r.body, r]));
    expect(by["on visible"]?.product).toEqual({ name: "Vis", slug: "vis" });
    expect(by["on hidden"]?.product).toBeNull();
    expect(by["standalone"]?.product).toBeNull();
  });

  it("maps photos only when all photo fields exist, newest first, respects limit", async () => {
    const base = { customerName: "X", source: "admin" as const, status: "approved" as const };
    await db.insert(schema.reviews).values([
      {
        ...base,
        body: "old",
        createdAt: new Date("2020-01-01"),
      },
      {
        ...base,
        body: "with photo",
        photoKey: "reviews/p",
        photoWidths: [320],
        photoWidth: 400,
        photoHeight: 500,
      },
    ]);
    const list = await fetchApprovedReviews(ctx);
    expect(list.map((r) => r.body)).toEqual(["with photo", "old"]);
    expect(list[0]?.photo?.baseUrl).toBe("https://media.test/reviews/p");
    expect(list[0]?.photo?.alt).toBe("Photo shared by X");
    expect(list[1]?.photo).toBeNull();
    expect(await fetchApprovedReviews(ctx, 1)).toHaveLength(1);
  });
});

describe("toPublicSettings", () => {
  const update = (v: Partial<typeof schema.siteSettings.$inferInsert>) =>
    db.update(schema.siteSettings).set(v).where(eq(schema.siteSettings.id, 1));

  it("announcement is null when disabled or blank", async () => {
    await update({ announcementEnabled: false, announcementText: "Sale!" });
    expect(toPublicSettings(ctx, await fetchSettingsRow(db)).announcement).toBeNull();
    await update({ announcementEnabled: true, announcementText: "   " });
    expect(toPublicSettings(ctx, await fetchSettingsRow(db)).announcement).toBeNull();
  });
  it("announcement is trimmed and href nullable when enabled", async () => {
    await update({ announcementEnabled: true, announcementText: "  Free delivery  ", announcementHref: "" });
    expect(toPublicSettings(ctx, await fetchSettingsRow(db)).announcement).toEqual({
      text: "Free delivery",
      href: null,
    });
    await update({ announcementHref: "/shop/sale" });
    expect(toPublicSettings(ctx, await fetchSettingsRow(db)).announcement?.href).toBe("/shop/sale");
  });
  it("hero image is null without a key and mapped with one", async () => {
    expect(toPublicSettings(ctx, await fetchSettingsRow(db)).hero.image).toBeNull();
    await update({
      heroImageKey: "banners/h",
      heroImageWidths: [640, 320],
      heroImageWidth: 1000,
      heroImageHeight: 500,
      heroImageAlt: "Hero",
    });
    expect(toPublicSettings(ctx, await fetchSettingsRow(db)).hero.image).toMatchObject({
      baseUrl: "https://media.test/banners/h",
      widths: [320, 640],
      alt: "Hero",
    });
  });
  it("hero image is null when the key exists but dimensions are missing", async () => {
    await update({ heroImageKey: "banners/h" });
    expect(toPublicSettings(ctx, await fetchSettingsRow(db)).hero.image).toBeNull();
  });
  it("converts empty contact fields to null", async () => {
    const s = toPublicSettings(ctx, await fetchSettingsRow(db));
    expect([s.whatsappNumber, s.instagramHandle, s.collabInstagramHandle]).toEqual([null, null, null]);
    await update({ whatsappNumber: "923001234567", instagramHandle: "usba" });
    const s2 = toPublicSettings(ctx, await fetchSettingsRow(db));
    expect(s2.whatsappNumber).toBe("923001234567");
    expect(s2.instagramHandle).toBe("usba");
  });
});
