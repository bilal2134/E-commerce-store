import "server-only";
import { and, asc, desc, eq, ilike, isNotNull, ne, or, sql, type SQL } from "drizzle-orm";
import { FOOTWEAR_SIZES, MIN_PRODUCT_IMAGES, SIZED_ROOT_CATEGORY, type StockStatus } from "@/domain/catalog";
import type { ProductInput } from "@/domain/validation/product";
import type { Database } from "../db/client";
import { categories, productImages, products, productSizes } from "../db/schema";
import { imageObjectKeys } from "../images/pipeline";
import type { ObjectStorage } from "../storage/types";
import { AdminError, uniqueViolation } from "./errors";

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export interface CategoryGroup {
  rootSlug: string;
  rootName: string;
  children: { id: string; name: string; slug: string }[];
}

/** Categories as L1 groups with selectable L2 children. */
export async function listCategoryGroups(database: Database): Promise<CategoryGroup[]> {
  const rows = await database
    .select({
      id: categories.id,
      parentId: categories.parentId,
      slug: categories.slug,
      name: categories.name,
    })
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.name));
  return rows
    .filter((r) => r.parentId === null)
    .map((root) => ({
      rootSlug: root.slug,
      rootName: root.name,
      children: rows
        .filter((c) => c.parentId === root.id)
        .map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    }))
    .filter((g) => g.children.length > 0);
}

export interface ProductListFilters {
  q?: string;
  /** L1 or L2 category id. */
  categoryId?: string;
  badge?: string;
  stock?: string;
  visibility?: "visible" | "hidden";
  page?: number;
  pageSize?: number;
}

export interface ProductListRow {
  id: string;
  code: string;
  slug: string;
  name: string;
  categoryName: string;
  pricePkr: number;
  salePricePkr: number | null;
  stockStatus: StockStatus;
  badge: string | null;
  isVisible: boolean;
  featuredRank: number | null;
  imageCount: number;
  thumb: { storageKey: string; widths: number[]; alt: string } | null;
}

export const PRODUCTS_PAGE_SIZE = 15;

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function listProducts(
  database: Database,
  filters: ProductListFilters,
): Promise<{ rows: ProductListRow[]; total: number; page: number; pageSize: number }> {
  const pageSize = filters.pageSize ?? PRODUCTS_PAGE_SIZE;
  const conds: SQL[] = [];
  const q = filters.q?.trim();
  if (q) {
    const like = `%${escapeLike(q)}%`;
    conds.push(or(ilike(products.name, like), ilike(products.code, like), ilike(products.slug, like))!);
  }
  if (filters.categoryId) {
    conds.push(or(eq(categories.id, filters.categoryId), eq(categories.parentId, filters.categoryId))!);
  }
  if (filters.badge === "none") conds.push(sql`${products.badge} is null`);
  else if (filters.badge) conds.push(sql`${products.badge} = ${filters.badge}`);
  if (filters.stock) conds.push(sql`${products.stockStatus} = ${filters.stock}`);
  if (filters.visibility === "visible") conds.push(eq(products.isVisible, true));
  if (filters.visibility === "hidden") conds.push(eq(products.isVisible, false));
  const where = conds.length ? and(...conds) : undefined;

  const [countRow] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(where);
  const total = countRow?.count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, filters.page ?? 1), lastPage);

  const rows = await database
    .select({
      id: products.id,
      code: products.code,
      slug: products.slug,
      name: products.name,
      categoryName: categories.name,
      pricePkr: products.pricePkr,
      salePricePkr: products.salePricePkr,
      stockStatus: products.stockStatus,
      badge: products.badge,
      isVisible: products.isVisible,
      featuredRank: products.featuredRank,
      imageCount: sql<number>`(select count(*)::int from product_images pi where pi.product_id = ${products.id})`,
      thumbKey: productImages.storageKey,
      thumbWidths: productImages.widths,
      thumbAlt: productImages.alt,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.position, 0)))
    .where(where)
    .orderBy(desc(products.createdAt), asc(products.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    total,
    page,
    pageSize,
    rows: rows.map((r) => ({
      id: r.id,
      code: r.code,
      slug: r.slug,
      name: r.name,
      categoryName: r.categoryName,
      pricePkr: r.pricePkr,
      salePricePkr: r.salePricePkr,
      stockStatus: r.stockStatus,
      badge: r.badge,
      isVisible: r.isVisible,
      featuredRank: r.featuredRank,
      imageCount: r.imageCount,
      thumb: r.thumbKey
        ? { storageKey: r.thumbKey, widths: r.thumbWidths ?? [], alt: r.thumbAlt ?? "" }
        : null,
    })),
  };
}

export interface ProductForEdit {
  id: string;
  code: string;
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  pricePkr: number;
  salePricePkr: number | null;
  stockStatus: StockStatus;
  badge: string | null;
  collabPartner: string | null;
  colors: string[];
  isVisible: boolean;
  featuredRank: number | null;
  sizes: { label: string; isAvailable: boolean }[];
  images: {
    storageKey: string;
    widths: number[];
    width: number;
    height: number;
    blurDataUrl: string | null;
    alt: string;
  }[];
}

export async function getProductForEdit(database: Database, id: string): Promise<ProductForEdit | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [p] = await database.select().from(products).where(eq(products.id, id)).limit(1);
  if (!p) return null;
  const [images, sizes] = await Promise.all([
    database
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position)),
    database
      .select()
      .from(productSizes)
      .where(eq(productSizes.productId, id))
      .orderBy(asc(productSizes.position)),
  ]);
  return {
    id: p.id,
    code: p.code,
    slug: p.slug,
    name: p.name,
    description: p.description,
    categoryId: p.categoryId,
    pricePkr: p.pricePkr,
    salePricePkr: p.salePricePkr,
    stockStatus: p.stockStatus,
    badge: p.badge,
    collabPartner: p.collabPartner,
    colors: p.colors,
    isVisible: p.isVisible,
    featuredRank: p.featuredRank,
    sizes: sizes.map((s) => ({ label: s.label, isAvailable: s.isAvailable })),
    images: images.map((i) => ({
      storageKey: i.storageKey,
      widths: i.widths,
      width: i.width,
      height: i.height,
      blurDataUrl: i.blurDataUrl,
      alt: i.alt,
    })),
  };
}

/** Lightweight list for pickers (orders, reviews). */
export async function listProductOptions(database: Database) {
  const rows = await database
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      pricePkr: products.pricePkr,
      salePricePkr: products.salePricePkr,
    })
    .from(products)
    .orderBy(asc(products.name));
  const sizes = await database
    .select({ productId: productSizes.productId, label: productSizes.label })
    .from(productSizes)
    .orderBy(asc(productSizes.position));
  const byProduct = new Map<string, string[]>();
  for (const s of sizes) byProduct.set(s.productId, [...(byProduct.get(s.productId) ?? []), s.label]);
  return rows.map((r) => ({
    ...r,
    currentPrice: r.salePricePkr !== null && r.salePricePkr < r.pricePkr ? r.salePricePkr : r.pricePkr,
    sizes: byProduct.get(r.id) ?? [],
  }));
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function loadSellableCategory(tx: Tx, categoryId: string): Promise<{ rootSlug: string }> {
  const [cat] = await tx
    .select({ id: categories.id, parentId: categories.parentId })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);
  if (!cat || !cat.parentId) {
    throw new AdminError("Choose a sub-category for this product.", { categoryId: "Choose a category" });
  }
  const [parent] = await tx
    .select({ slug: categories.slug })
    .from(categories)
    .where(eq(categories.id, cat.parentId))
    .limit(1);
  return { rootSlug: parent?.slug ?? "" };
}

async function assertSlugFree(tx: Tx, slug: string, exceptId?: string): Promise<void> {
  const [existing] = await tx
    .select({ id: products.id })
    .from(products)
    .where(exceptId ? and(eq(products.slug, slug), ne(products.id, exceptId)) : eq(products.slug, slug))
    .limit(1);
  if (existing) {
    throw new AdminError("That URL slug is already used by another product.", {
      slug: "This slug is already used by another product. Try a different one.",
    });
  }
}

function assertImages(input: ProductInput): void {
  if (input.isVisible && input.images.length < MIN_PRODUCT_IMAGES) {
    throw new AdminError(`Add at least ${MIN_PRODUCT_IMAGES} images to show this product on the site.`, {
      images: `Add at least ${MIN_PRODUCT_IMAGES} images to show this product on the site`,
    });
  }
  const keys = input.images.map((i) => i.storageKey);
  if (new Set(keys).size !== keys.length) throw new AdminError("The same image was added twice.");
}

async function nextFeaturedRank(tx: Tx): Promise<number> {
  const [row] = await tx
    .select({ max: sql<number>`coalesce(max(${products.featuredRank}), 0)::int` })
    .from(products);
  return (row?.max ?? 0) + 1;
}

async function writeSizesAndImages(
  tx: Tx,
  productId: string,
  rootSlug: string,
  input: ProductInput,
): Promise<void> {
  await tx.delete(productSizes).where(eq(productSizes.productId, productId));
  if (rootSlug === SIZED_ROOT_CATEGORY && input.sizes.length > 0) {
    await tx
      .insert(productSizes)
      .values(
        [...input.sizes]
          .sort((a, b) => FOOTWEAR_SIZES.indexOf(a.label) - FOOTWEAR_SIZES.indexOf(b.label))
          .map((s, position) => ({ productId, label: s.label, position, isAvailable: s.isAvailable })),
      );
  }
  await tx.delete(productImages).where(eq(productImages.productId, productId));
  if (input.images.length > 0) {
    await tx.insert(productImages).values(
      input.images.map((img, position) => ({
        productId,
        position,
        storageKey: img.storageKey,
        widths: img.widths,
        width: img.width,
        height: img.height,
        alt: img.alt,
        blurDataUrl: img.blurDataUrl,
      })),
    );
  }
}

function friendlyConflict(err: unknown): never {
  const constraint = uniqueViolation(err);
  if (constraint?.includes("slug")) {
    throw new AdminError("That URL slug is already used by another product.", {
      slug: "This slug is already used by another product. Try a different one.",
    });
  }
  if (constraint?.includes("storage_key")) {
    throw new AdminError("One of these images is already attached to another product.");
  }
  throw err;
}

export async function createProduct(database: Database, input: ProductInput): Promise<{ id: string }> {
  assertImages(input);
  try {
    return await database.transaction(async (tx) => {
      const { rootSlug } = await loadSellableCategory(tx, input.categoryId);
      await assertSlugFree(tx, input.slug);
      const [row] = await tx
        .insert(products)
        .values({
          slug: input.slug,
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          pricePkr: input.pricePkr,
          salePricePkr: input.salePricePkr,
          stockStatus: input.stockStatus,
          badge: input.badge,
          collabPartner: input.collabPartner,
          colors: input.colors,
          isVisible: input.isVisible,
          featuredRank: input.featured ? await nextFeaturedRank(tx) : null,
        })
        .returning({ id: products.id });
      await writeSizesAndImages(tx, row!.id, rootSlug, input);
      return { id: row!.id };
    });
  } catch (err) {
    if (err instanceof AdminError) throw err;
    return friendlyConflict(err);
  }
}

export async function updateProduct(
  database: Database,
  storage: ObjectStorage,
  id: string,
  input: ProductInput,
): Promise<void> {
  assertImages(input);
  let removed: { storageKey: string; widths: number[] }[] = [];
  try {
    removed = await database.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: products.id, featuredRank: products.featuredRank })
        .from(products)
        .where(eq(products.id, id))
        .for("update");
      if (!existing) throw new AdminError("This product no longer exists.");
      const { rootSlug } = await loadSellableCategory(tx, input.categoryId);
      await assertSlugFree(tx, input.slug, id);
      const oldImages = await tx
        .select({ storageKey: productImages.storageKey, widths: productImages.widths })
        .from(productImages)
        .where(eq(productImages.productId, id));
      await tx
        .update(products)
        .set({
          slug: input.slug,
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          pricePkr: input.pricePkr,
          salePricePkr: input.salePricePkr,
          stockStatus: input.stockStatus,
          badge: input.badge,
          collabPartner: input.collabPartner,
          colors: input.colors,
          isVisible: input.isVisible,
          featuredRank: input.featured ? (existing.featuredRank ?? (await nextFeaturedRank(tx))) : null,
        })
        .where(eq(products.id, id));
      await writeSizesAndImages(tx, id, rootSlug, input);
      if (!input.featured && existing.featuredRank !== null) await compactFeaturedRanks(tx);
      const kept = new Set(input.images.map((i) => i.storageKey));
      return oldImages.filter((o) => !kept.has(o.storageKey));
    });
  } catch (err) {
    if (err instanceof AdminError) throw err;
    return friendlyConflict(err);
  }
  await deleteObjects(storage, removed);
}

export async function deleteProduct(database: Database, storage: ObjectStorage, id: string): Promise<void> {
  const removed = await database.transaction(async (tx) => {
    const imgs = await tx
      .select({ storageKey: productImages.storageKey, widths: productImages.widths })
      .from(productImages)
      .where(eq(productImages.productId, id));
    const deleted = await tx
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id, rank: products.featuredRank });
    if (deleted.length === 0) throw new AdminError("This product no longer exists.");
    if (deleted[0]?.rank !== null) await compactFeaturedRanks(tx);
    return imgs;
  });
  await deleteObjects(storage, removed);
}

/** Best-effort removal of storage objects after the DB commit succeeded. */
export async function deleteObjects(
  storage: ObjectStorage,
  images: readonly { storageKey: string; widths: readonly number[] }[],
): Promise<void> {
  if (images.length === 0) return;
  try {
    await storage.deleteMany(images.flatMap((i) => imageObjectKeys(i.storageKey, i.widths)));
  } catch (err) {
    console.error("Failed to delete storage objects (orphans remain)", err);
  }
}

/** Delete an uploaded-but-unsaved image, only if no product/review/settings row references it. */
export async function discardUnreferencedImage(
  database: Database,
  storage: ObjectStorage,
  image: { storageKey: string; widths: number[] },
): Promise<void> {
  const [ref] = await database
    .select({ id: productImages.id })
    .from(productImages)
    .where(eq(productImages.storageKey, image.storageKey))
    .limit(1);
  if (ref) return;
  await deleteObjects(storage, [image]);
}

export async function setProductVisibility(database: Database, id: string, visible: boolean): Promise<void> {
  if (visible) {
    const [row] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(productImages)
      .where(eq(productImages.productId, id));
    if ((row?.count ?? 0) < MIN_PRODUCT_IMAGES) {
      throw new AdminError(
        `Add at least ${MIN_PRODUCT_IMAGES} images before showing this product on the site.`,
      );
    }
  }
  const updated = await database
    .update(products)
    .set({ isVisible: visible })
    .where(eq(products.id, id))
    .returning({ id: products.id });
  if (updated.length === 0) throw new AdminError("This product no longer exists.");
}

export async function setProductStock(database: Database, id: string, stock: StockStatus): Promise<void> {
  const updated = await database
    .update(products)
    .set({ stockStatus: stock })
    .where(eq(products.id, id))
    .returning({ id: products.id });
  if (updated.length === 0) throw new AdminError("This product no longer exists.");
}

/* ------------------------------------------------------------------ */
/* Featured products (AS-18)                                           */
/* ------------------------------------------------------------------ */

async function compactFeaturedRanks(tx: Tx): Promise<void> {
  await tx.execute(sql`
    update products p set featured_rank = r.rn
    from (
      select id, row_number() over (order by featured_rank, created_at, id)::int as rn
      from products where featured_rank is not null
    ) r
    where p.id = r.id and p.featured_rank is distinct from r.rn
  `);
}

export interface FeaturedRow {
  id: string;
  name: string;
  code: string;
  isVisible: boolean;
  stockStatus: StockStatus;
  thumb: { storageKey: string; widths: number[]; alt: string } | null;
}

export async function listFeatured(database: Database): Promise<FeaturedRow[]> {
  const rows = await database
    .select({
      id: products.id,
      name: products.name,
      code: products.code,
      isVisible: products.isVisible,
      stockStatus: products.stockStatus,
      thumbKey: productImages.storageKey,
      thumbWidths: productImages.widths,
      thumbAlt: productImages.alt,
    })
    .from(products)
    .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.position, 0)))
    .where(isNotNull(products.featuredRank))
    .orderBy(asc(products.featuredRank), asc(products.createdAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    isVisible: r.isVisible,
    stockStatus: r.stockStatus,
    thumb: r.thumbKey ? { storageKey: r.thumbKey, widths: r.thumbWidths ?? [], alt: r.thumbAlt ?? "" } : null,
  }));
}

/** Products that can be added to the featured list. */
export async function listNotFeatured(
  database: Database,
): Promise<{ id: string; name: string; code: string }[]> {
  return database
    .select({ id: products.id, name: products.name, code: products.code })
    .from(products)
    .where(and(eq(products.isVisible, true), sql`${products.featuredRank} is null`))
    .orderBy(asc(products.name));
}

export async function setFeaturedOrder(database: Database, orderedIds: string[]): Promise<void> {
  await database.transaction(async (tx) => {
    const current = await tx
      .select({ id: products.id })
      .from(products)
      .where(isNotNull(products.featuredRank))
      .orderBy(asc(products.featuredRank), asc(products.createdAt))
      .for("update");
    const currentIds = new Set(current.map((c) => c.id));
    const named = orderedIds.filter((i, idx) => currentIds.has(i) && orderedIds.indexOf(i) === idx);
    const namedSet = new Set(named);
    // Featured products not named in the list keep their relative order after the named ones.
    const finalOrder = [...named, ...current.map((c) => c.id).filter((i) => !namedSet.has(i))];
    for (const [i, id] of finalOrder.entries()) {
      await tx
        .update(products)
        .set({ featuredRank: i + 1 })
        .where(eq(products.id, id));
    }
  });
}

export async function addFeatured(database: Database, id: string): Promise<void> {
  await database.transaction(async (tx) => {
    const [p] = await tx
      .select({ featuredRank: products.featuredRank })
      .from(products)
      .where(eq(products.id, id))
      .for("update");
    if (!p) throw new AdminError("This product no longer exists.");
    if (p.featuredRank !== null) return;
    await tx
      .update(products)
      .set({ featuredRank: await nextFeaturedRank(tx) })
      .where(eq(products.id, id));
  });
}

export async function removeFeatured(database: Database, id: string): Promise<void> {
  await database.transaction(async (tx) => {
    await tx.update(products).set({ featuredRank: null }).where(eq(products.id, id));
    await compactFeaturedRanks(tx);
  });
}
