import "server-only";
import { asc, count, eq, isNull } from "drizzle-orm";
import type { Database } from "../db/client";
import { categories, products } from "../db/schema";
import { AdminError, uniqueViolation } from "./errors";

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  position: number;
  productCount: number;
  children: AdminCategory[];
}

/** Category tree with product counts (top-level counts include their children). */
export async function listCategoryTree(database: Database): Promise<AdminCategory[]> {
  const [rows, counts] = await Promise.all([
    database.select().from(categories).orderBy(asc(categories.position), asc(categories.name)),
    database
      .select({ categoryId: products.categoryId, n: count() })
      .from(products)
      .groupBy(products.categoryId),
  ]);
  const byCat = new Map(counts.map((c) => [c.categoryId, Number(c.n)]));
  const node = (r: (typeof rows)[number]): AdminCategory => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    position: r.position,
    productCount: byCat.get(r.id) ?? 0,
    children: [],
  });
  const roots = rows.filter((r) => r.parentId === null).map(node);
  for (const root of roots) {
    root.children = rows.filter((r) => r.parentId === root.id).map(node);
    root.productCount += root.children.reduce((sum, c) => sum + c.productCount, 0);
  }
  return roots;
}

export async function updateCategoryDetails(
  database: Database,
  id: string,
  input: { name: string; description: string },
): Promise<void> {
  const rows = await database
    .update(categories)
    .set({ name: input.name, description: input.description })
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  if (rows.length === 0) throw new AdminError("That category no longer exists.");
}

/** New sub-category under a top-level section, added at the end. */
export async function createSubcategory(
  database: Database,
  input: { parentId: string; slug: string; name: string; description: string },
): Promise<void> {
  const [parent] = await database.select().from(categories).where(eq(categories.id, input.parentId)).limit(1);
  if (!parent || parent.parentId !== null) {
    throw new AdminError("Choose a top-level section.", { parentId: "Choose a top-level section." });
  }
  const [{ n } = { n: 0 }] = await database
    .select({ n: count() })
    .from(categories)
    .where(eq(categories.parentId, input.parentId));
  try {
    await database.insert(categories).values({ ...input, position: Number(n) });
  } catch (err) {
    if (uniqueViolation(err) !== null) {
      throw new AdminError("That link is already used.", {
        slug: "That link is already used by another category.",
      });
    }
    throw err;
  }
}

/** Only empty sub-categories can be deleted; products must be moved first. */
export async function deleteCategory(database: Database, id: string): Promise<void> {
  const [row] = await database.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!row) throw new AdminError("That category no longer exists.");
  if (row.parentId === null) throw new AdminError("Top-level sections can't be deleted.");
  const [{ n } = { n: 0 }] = await database
    .select({ n: count() })
    .from(products)
    .where(eq(products.categoryId, id));
  const total = Number(n);
  if (total > 0) {
    throw new AdminError(
      `Move its ${total} ${total === 1 ? "product" : "products"} to another category first.`,
    );
  }
  await database.delete(categories).where(eq(categories.id, id));
}

/** Swap a category with its neighbour among its siblings. */
export async function moveCategory(database: Database, id: string, direction: "up" | "down"): Promise<void> {
  await database.transaction(async (tx) => {
    const [row] = await tx.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!row) throw new AdminError("That category no longer exists.");
    const siblings = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(row.parentId === null ? isNull(categories.parentId) : eq(categories.parentId, row.parentId))
      .orderBy(asc(categories.position), asc(categories.name));
    const from = siblings.findIndex((s) => s.id === id);
    const to = direction === "up" ? from - 1 : from + 1;
    if (to < 0 || to >= siblings.length) return;
    const order = siblings.map((s) => s.id);
    [order[from], order[to]] = [order[to]!, order[from]!];
    for (const [i, cid] of order.entries()) {
      await tx.update(categories).set({ position: i }).where(eq(categories.id, cid));
    }
  });
}
