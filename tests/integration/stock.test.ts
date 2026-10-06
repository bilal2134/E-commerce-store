import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { ProductInput } from "@/domain/validation/product";
import { AdminError } from "@/server/admin/errors";
import { changeOrderStatus, createManualOrder } from "@/server/admin/orders";
import { createProduct, setProductStock, updateProduct } from "@/server/admin/products";
import { adjustStock, listStock } from "@/server/admin/stock";
import { fetchVisibleProductBySlug, type QueryContext } from "@/server/catalog/queries";
import type { ObjectStorage } from "@/server/storage/types";
import { closeDb, resetDb, schema, testDb } from "@tests/helpers/db";

const db = testDb();
const ctx: QueryContext = { db, mediaUrl: (key) => `https://media.test/${key}` };
const storage: ObjectStorage = { put: async () => {}, deleteMany: async () => {}, publicUrl: (k) => k };
let heels: string;
let wallets: string;
let adminId: string;

beforeEach(async () => {
  await resetDb();
  const [footwear] = await db
    .insert(schema.categories)
    .values({ slug: "footwear", name: "Footwear" })
    .returning();
  const [bags] = await db.insert(schema.categories).values({ slug: "bags", name: "Bags" }).returning();
  const [h] = await db
    .insert(schema.categories)
    .values({ slug: "heels", name: "Heels", parentId: footwear!.id })
    .returning();
  const [w] = await db
    .insert(schema.categories)
    .values({ slug: "wallets", name: "Wallets", parentId: bags!.id })
    .returning();
  heels = h!.id;
  wallets = w!.id;
  const [admin] = await db
    .insert(schema.adminUsers)
    .values({ email: "owner@example.com", passwordHash: "x" })
    .returning();
  adminId = admin!.id;
});

afterAll(closeDb);

function input(over: Partial<ProductInput> = {}): ProductInput {
  return {
    name: "Cherry Heels",
    slug: "cherry-heels",
    description: "Sample",
    categoryId: heels,
    pricePkr: 2499,
    salePricePkr: null,
    stockStatus: "in_stock",
    badge: null,
    collabPartner: null,
    colors: [],
    isVisible: false,
    featured: false,
    sizes: [],
    trackStock: true,
    stockQuantity: null,
    stockBase: null,
    images: [],
    ...over,
  };
}

const size = (label: "36" | "37" | "38", qty: number | null, base: number | null = null) => ({
  label,
  isAvailable: true,
  stockQuantity: qty,
  stockBase: base,
});

async function state(id: string) {
  const [p] = await db.select().from(schema.products).where(eq(schema.products.id, id));
  const sizes = await db.select().from(schema.productSizes).where(eq(schema.productSizes.productId, id));
  return {
    status: p!.stockStatus,
    total: p!.stockQuantity,
    sizes: Object.fromEntries(sizes.map((s) => [s.label, { qty: s.stockQuantity, on: s.isAvailable }])),
  };
}

function order(
  productId: string,
  over: { size?: string; quantity?: number; status?: "received" | "cancelled" } = {},
) {
  return createManualOrder(db, adminId, {
    customerName: "Ayesha",
    customerPhone: "03001234567",
    productId,
    size: over.size ?? null,
    quantity: over.quantity ?? 1,
    unitPricePkr: 2499,
    status: over.status ?? "received",
    channel: "whatsapp",
    notes: "",
  });
}

describe("stock quantities", () => {
  it("sums sized stock, marks empty sizes unavailable and derives the status", async () => {
    const { id } = await createProduct(db, input({ sizes: [size("36", 2), size("37", 0), size("38", 3)] }));
    expect(await state(id)).toEqual({
      status: "in_stock",
      total: 5,
      sizes: { "36": { qty: 2, on: true }, "37": { qty: 0, on: false }, "38": { qty: 3, on: true } },
    });

    await adjustStock(db, { productId: id, size: "36", delta: -2 });
    await adjustStock(db, { productId: id, size: "38", delta: -3 });
    expect((await state(id)).status).toBe("out_of_stock");
    const result = await adjustStock(db, { productId: id, size: "37", delta: 4 });
    expect(result).toEqual({ quantity: 4, status: "in_stock" });
    expect((await state(id)).sizes["37"]).toEqual({ qty: 4, on: true });
  });

  it("never goes below zero and refuses products that don't count stock", async () => {
    const { id } = await createProduct(db, input({ categoryId: wallets, stockQuantity: 1 }));
    expect((await adjustStock(db, { productId: id, size: null, delta: -5 })).quantity).toBe(0);
    const untracked = await createProduct(
      db,
      input({ slug: "plain", categoryId: wallets, trackStock: false, stockStatus: "out_of_stock" }),
    );
    expect((await state(untracked.id)).total).toBeNull();
    await expect(adjustStock(db, { productId: untracked.id, size: null, delta: 1 })).rejects.toThrow(
      AdminError,
    );
  });

  it("takes stock when an order is logged, gives it back on cancel and takes it again on reopen", async () => {
    const { id } = await createProduct(db, input({ sizes: [size("38", 2)] }));
    const first = await order(id, { size: "38", quantity: 2 });
    expect((await state(id)).sizes["38"]).toEqual({ qty: 0, on: false });
    expect((await state(id)).status).toBe("out_of_stock");

    // Not enough left: the order is refused and nothing is written.
    await expect(order(id, { size: "38" })).rejects.toThrow(/out of stock/);
    expect(await db.select().from(schema.orders)).toHaveLength(1);

    await changeOrderStatus(db, adminId, first.id, "cancelled", "");
    expect((await state(id)).sizes["38"]).toEqual({ qty: 2, on: true });

    // Delivered doesn't take stock twice; reopening a cancelled order does.
    await changeOrderStatus(db, adminId, first.id, "processing", "");
    await changeOrderStatus(db, adminId, first.id, "delivered", "");
    expect((await state(id)).total).toBe(0);
  });

  it("refuses to reopen a cancelled order when the stock has gone", async () => {
    const { id } = await createProduct(db, input({ categoryId: wallets, stockQuantity: 1 }));
    const first = await order(id);
    await changeOrderStatus(db, adminId, first.id, "cancelled", "");
    await order(id);
    await expect(changeOrderStatus(db, adminId, first.id, "received", "")).rejects.toThrow(/out of stock/);
    const [row] = await db.select().from(schema.orders).where(eq(schema.orders.id, first.id));
    expect(row!.status).toBe("cancelled");
  });

  it("doesn't use stock for preorders or orders logged as cancelled", async () => {
    const pre = await createProduct(
      db,
      input({ categoryId: wallets, stockStatus: "preorder", stockQuantity: 0 }),
    );
    await order(pre.id, { quantity: 3 });
    expect(await state(pre.id)).toMatchObject({ status: "preorder", total: 0 });

    const normal = await createProduct(db, input({ slug: "w2", categoryId: wallets, stockQuantity: 1 }));
    await order(normal.id, { status: "cancelled" });
    expect((await state(normal.id)).total).toBe(1);
  });

  it("keeps orders logged while the product form was open", async () => {
    const { id } = await createProduct(db, input({ sizes: [size("36", 5)] }));
    await order(id, { size: "36" }); // 4 left; the open form still shows 5
    await updateProduct(db, storage, id, input({ sizes: [size("36", 8, 5), size("37", 2)] }));
    expect((await state(id)).sizes).toEqual({ "36": { qty: 7, on: true }, "37": { qty: 2, on: true } });

    // Turning counting off clears the counts and hands availability back to the admin.
    await updateProduct(db, storage, id, input({ trackStock: false, sizes: [size("36", null)] }));
    expect(await state(id)).toEqual({
      status: "in_stock",
      total: null,
      sizes: { "36": { qty: null, on: true } },
    });
  });

  it("only allows preorder as a manual status for counted products", async () => {
    const { id } = await createProduct(db, input({ categoryId: wallets, stockQuantity: 3 }));
    await expect(setProductStock(db, id, "out_of_stock")).rejects.toThrow(/counts its stock/);
    expect((await state(id)).status).toBe("in_stock");
    await setProductStock(db, id, "preorder");
    expect((await state(id)).status).toBe("preorder");
    await setProductStock(db, id, "in_stock");
    expect((await state(id)).status).toBe("in_stock");
  });

  it("shows customers a count only when it is low", async () => {
    const { id } = await createProduct(
      db,
      input({ isVisible: false, sizes: [size("36", 2), size("37", 9), size("38", 0)] }),
    );
    await db.update(schema.products).set({ isVisible: true }).where(eq(schema.products.id, id));
    const product = await fetchVisibleProductBySlug(ctx, "cherry-heels");
    expect(product!.remaining).toBeNull(); // 11 in total
    expect(product!.sizes).toEqual([
      { label: "36", isAvailable: true, remaining: 2 },
      { label: "37", isAvailable: true, remaining: null },
      { label: "38", isAvailable: false, remaining: null },
    ]);
    expect(product).not.toHaveProperty("stockQuantity");
  });

  it("lists low stock for the Stock page", async () => {
    await createProduct(db, input({ sizes: [size("36", 1), size("37", 20)] }));
    await createProduct(db, input({ slug: "plenty", categoryId: wallets, stockQuantity: 40 }));
    await createProduct(db, input({ slug: "manual", categoryId: wallets, trackStock: false }));
    const low = await listStock(db, { filter: "low" });
    expect(low.map((r) => r.name)).toEqual(["Cherry Heels"]);
    expect(low[0]!.sizes).toEqual([
      { label: "36", quantity: 1, low: true },
      { label: "37", quantity: 20, low: false },
    ]);
    expect((await listStock(db, { filter: "untracked" })).map((r) => r.quantity)).toEqual([null]);
  });
});
