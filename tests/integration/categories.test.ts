import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  createSubcategory,
  deleteCategory,
  listCategoryTree,
  moveCategory,
  updateCategoryDetails,
} from "@/server/admin/categories";
import { AdminError } from "@/server/admin/errors";
import { closeDb, resetDb, schema, testDb } from "@tests/helpers/db";

const db = testDb();
let footwear: string;
let heels: string;
let sneakers: string;

beforeEach(async () => {
  await resetDb();
  const [root] = await db
    .insert(schema.categories)
    .values({ slug: "footwear", name: "Footwear", position: 0 })
    .returning();
  footwear = root!.id;
  await db.insert(schema.categories).values({ slug: "bags", name: "Bags", position: 1 });
  const [h] = await db
    .insert(schema.categories)
    .values({ slug: "heels", name: "Heels", parentId: footwear, position: 0 })
    .returning();
  const [s] = await db
    .insert(schema.categories)
    .values({ slug: "sneakers", name: "Sneakers", parentId: footwear, position: 1 })
    .returning();
  heels = h!.id;
  sneakers = s!.id;
  await db.insert(schema.products).values({
    slug: "diva",
    name: "Diva",
    description: "d",
    categoryId: heels,
    pricePkr: 2000,
    isVisible: true,
  });
});
afterAll(closeDb);

describe("category management", () => {
  it("lists the tree with product counts rolled up", async () => {
    const tree = await listCategoryTree(db);
    expect(tree.map((r) => [r.slug, r.productCount])).toEqual([
      ["footwear", 1],
      ["bags", 0],
    ]);
    expect(tree[0]!.children.map((c) => [c.slug, c.productCount])).toEqual([
      ["heels", 1],
      ["sneakers", 0],
    ]);
  });

  it("updates name and description", async () => {
    await updateCategoryDetails(db, heels, { name: "Heels & Pumps", description: "Statement heels." });
    const [row] = await db.select().from(schema.categories).where(eq(schema.categories.id, heels));
    expect(row).toMatchObject({ name: "Heels & Pumps", description: "Statement heels.", slug: "heels" });
  });

  it("creates sub-categories at the end and rejects duplicates or nested parents", async () => {
    await createSubcategory(db, { parentId: footwear, slug: "boots", name: "Boots", description: "" });
    const tree = await listCategoryTree(db);
    expect(tree[0]!.children.map((c) => c.slug)).toEqual(["heels", "sneakers", "boots"]);
    await expect(
      createSubcategory(db, { parentId: footwear, slug: "boots", name: "Boots 2", description: "" }),
    ).rejects.toBeInstanceOf(AdminError);
    await expect(
      createSubcategory(db, { parentId: heels, slug: "kitten", name: "Kitten", description: "" }),
    ).rejects.toBeInstanceOf(AdminError);
  });

  it("reorders siblings", async () => {
    await moveCategory(db, sneakers, "up");
    const tree = await listCategoryTree(db);
    expect(tree[0]!.children.map((c) => c.slug)).toEqual(["sneakers", "heels"]);
    await moveCategory(db, sneakers, "up"); // already first: no-op
    expect((await listCategoryTree(db))[0]!.children[0]!.slug).toBe("sneakers");
  });

  it("deletes only empty sub-categories", async () => {
    await expect(deleteCategory(db, heels)).rejects.toThrow(/Move its 1 product/);
    await expect(deleteCategory(db, footwear)).rejects.toThrow(/Top-level/);
    await deleteCategory(db, sneakers);
    expect((await listCategoryTree(db))[0]!.children.map((c) => c.slug)).toEqual(["heels"]);
  });
});
