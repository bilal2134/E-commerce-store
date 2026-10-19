/**
 * Imports USBA's real catalogue (scripts/catalog/usba-catalog.ts) and replaces
 * the development sample content.
 *
 *   pnpm catalog:import -- --images "D:/Usman-store/all content" --replace-samples
 *   (production: pnpm aws:catalog -- --images … --replace-samples)
 *
 * What it changes:
 * - removes sample products (seed names), sample reviews ("[Sample review]"),
 *   sample orders ("Sample order customer …") and sample Instagram posts, with
 *   their stored images. Anything the owner created is left alone.
 * - removes this catalogue's own products first, so re-running replaces them.
 * - sets up the categories (Footwear: Heels, Flats & Sandals, Sneakers; Bags;
 *   Clothing: Tees, Hoodies; Accessories: Watches) and drops emptied sample ones.
 * - creates every product through the admin code path (createProduct), so
 *   stock, sizes and validation behave exactly as in the admin panel.
 * - sets the homepage banner, the Instagram grid and the 35–42 size chart.
 *
 * Photos: the bottom black band left by phone screenshots is cropped off.
 */
import fs from "node:fs";
import path from "node:path";
import { eq, inArray, like, or, sql } from "drizzle-orm";
import sharp from "sharp";
import { FOOTWEAR_SIZES } from "../src/domain/catalog";
import { slugify } from "../src/domain/validation/common";
import type { ProductInput } from "../src/domain/validation/product";
import { createProduct } from "../src/server/admin/products";
import * as s from "../src/server/db/schema";
import { imageObjectKeys, processAndStoreImage } from "../src/server/images/pipeline";
import type { ObjectStorage } from "../src/server/storage/types";
import { BANNER, CATALOG, CATALOG_CATEGORIES, INSTAGRAM_PICKS } from "./catalog/usba-catalog";
import { connect, scriptStorage } from "./lib/script-db";
import { SEED_CATEGORIES, SEED_PRODUCTS, SEED_SIZE_CHART } from "./seed-data";

const STOCK_EACH = 10;

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const imagesRoot = flag("--images");
if (!imagesRoot || !fs.existsSync(imagesRoot)) {
  console.error('Pass --images "<folder with the category folders>".');
  process.exit(1);
}
if (!args.includes("--replace-samples")) {
  console.error("Pass --replace-samples to confirm: sample content is removed and the catalogue imported.");
  process.exit(1);
}

/** Category tree for the real catalogue: [root, child] slugs and names. */
const TREE = [
  {
    slug: "footwear",
    name: "Footwear",
    description: "Heels, flats, sandals and sneakers.",
    children: [
      { slug: "heels", name: "Heels", description: "Mary Janes, slingbacks and statement heels." },
      {
        slug: "flats",
        name: "Flats & Sandals",
        description: "Ballet flats, Mary Janes, slides and sandals.",
      },
      { slug: "sneakers", name: "Sneakers", description: "Retro low-tops and Mary Jane sneakers." },
    ],
  },
  {
    slug: "bags",
    name: "Bags",
    description: "Mini totes, shoulder bags, hobos and crossbodies.",
    children: [
      { slug: "handbags", name: "Bags", description: "Mini totes, shoulder bags, hobos and crossbodies." },
    ],
  },
  {
    slug: "clothing",
    name: "Clothing",
    description: "Oversized tees and hoodies.",
    children: [
      { slug: "tees", name: "Tees", description: "Oversized graphic, jersey and raglan tees." },
      { slug: "hoodies", name: "Hoodies", description: "Zip and half-zip hoodies and sweatshirts." },
    ],
  },
  {
    slug: "accessories",
    name: "Accessories",
    description: "Watches.",
    children: [{ slug: "watches", name: "Watches", description: "Gold, silver and two-tone watches." }],
  },
];
/** Catalogue category → the sub-category products go into. */
const TARGET: Record<string, string> = { bags: "handbags" };

function photoFiles(folder: string): string[] {
  const outer = path.join(imagesRoot!, folder);
  const inner = fs.existsSync(path.join(outer, folder)) ? path.join(outer, folder) : outer;
  return fs
    .readdirSync(inner)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort()
    .map((f) => path.join(inner, f));
}

/** Upright JPEG with the phone-screenshot black band removed from the bottom. */
async function preparePhoto(file: string): Promise<Uint8Array> {
  const upright = await sharp(file).rotate().toBuffer();
  const { data, info } = await sharp(upright).greyscale().raw().toBuffer({ resolveWithObject: true });
  const rowMean = (y: number) => {
    let sum = 0;
    for (let x = 0; x < info.width; x++) sum += data[y * info.width + x]!;
    return sum / info.width;
  };
  let band = 0;
  while (band < info.height / 4 && rowMean(info.height - 1 - band) < 6) band++;
  const cropped =
    band > 0
      ? sharp(upright).extract({ left: 0, top: 0, width: info.width, height: info.height - band })
      : sharp(upright);
  return new Uint8Array(await cropped.jpeg({ quality: 92 }).toBuffer());
}

async function deleteStored(
  storage: ObjectStorage,
  items: { storageKey: string | null; widths: number[] | null }[],
) {
  const keys = items.flatMap((i) =>
    i.storageKey && i.widths ? imageObjectKeys(i.storageKey, i.widths) : [],
  );
  for (let i = 0; i < keys.length; i += 500) await storage.deleteMany(keys.slice(i, i + 500));
}

async function main() {
  const { sql: client, db } = connect();
  const storage = scriptStorage();
  const photos = new Map(CATALOG_CATEGORIES.map((c) => [c.slug, photoFiles(c.folder)]));
  const photoFor = (category: string, n: number) => {
    const file = photos.get(category)?.[n - 1];
    if (!file) throw new Error(`No photo ${n} in ${category}`);
    return file;
  };
  // Fail before changing anything if a referenced photo is missing.
  for (const item of CATALOG) for (const n of [item.photo, ...(item.extra ?? [])]) photoFor(item.category, n);
  photoFor(BANNER.category, BANNER.photo);
  for (const p of INSTAGRAM_PICKS) photoFor(p.category, p.photo);

  try {
    /* 1. Remove sample content and earlier imports of this catalogue. */
    const replaceSlugs = [
      ...new Set([...SEED_PRODUCTS.map((p) => slugify(p.name)), ...CATALOG.map((p) => slugify(p.name))]),
    ];
    const doomed = await db
      .select({ id: s.products.id })
      .from(s.products)
      .where(inArray(s.products.slug, replaceSlugs));
    const doomedIds = doomed.map((d) => d.id);
    if (doomedIds.length) {
      const imgs = await db
        .select({ storageKey: s.productImages.storageKey, widths: s.productImages.widths })
        .from(s.productImages)
        .where(inArray(s.productImages.productId, doomedIds));
      for (let i = 0; i < doomedIds.length; i += 50) {
        await db.delete(s.products).where(inArray(s.products.id, doomedIds.slice(i, i + 50)));
      }
      await deleteStored(storage, imgs);
    }
    console.log(`Removed ${doomedIds.length} sample/previous products`);

    const sampleReviews = await db
      .select({ id: s.reviews.id, storageKey: s.reviews.photoKey, widths: s.reviews.photoWidths })
      .from(s.reviews)
      .where(like(s.reviews.body, "[Sample review]%"));
    if (sampleReviews.length) {
      await db.delete(s.reviews).where(
        inArray(
          s.reviews.id,
          sampleReviews.map((r) => r.id),
        ),
      );
      await deleteStored(storage, sampleReviews);
    }
    const sampleOrders = await db
      .delete(s.orders)
      .where(like(s.orders.customerName, "Sample order customer%"))
      .returning({ id: s.orders.id });
    const oldPosts = await db
      .select({
        id: s.instagramPosts.id,
        storageKey: s.instagramPosts.storageKey,
        widths: s.instagramPosts.widths,
      })
      .from(s.instagramPosts)
      .where(
        or(
          like(s.instagramPosts.alt, "Sample Instagram post%"),
          inArray(
            s.instagramPosts.alt,
            INSTAGRAM_PICKS.map((p) => p.alt),
          ),
        ),
      );
    if (oldPosts.length) {
      await db.delete(s.instagramPosts).where(
        inArray(
          s.instagramPosts.id,
          oldPosts.map((p) => p.id),
        ),
      );
      await deleteStored(storage, oldPosts);
    }
    console.log(
      `Removed ${sampleReviews.length} sample reviews, ${sampleOrders.length} sample orders, ${oldPosts.length} sample Instagram posts`,
    );

    /* 2. Categories. */
    const ids = new Map<string, string>();
    for (const [rootPos, root] of TREE.entries()) {
      ids.set(root.slug, await upsertCategory(db, root, null, rootPos));
      for (const [pos, child] of root.children.entries()) {
        ids.set(child.slug, await upsertCategory(db, child, ids.get(root.slug)!, pos));
      }
    }
    // Sample categories left empty are removed (children first).
    const sampleSlugs = SEED_CATEGORIES.flatMap((r) => [...r.children.map((c) => c.slug), r.slug]);
    const keep = new Set(TREE.flatMap((r) => [r.slug, ...r.children.map((c) => c.slug)]));
    for (const slug of sampleSlugs.filter((sl) => !keep.has(sl))) {
      const [cat] = await db
        .select({ id: s.categories.id })
        .from(s.categories)
        .where(eq(s.categories.slug, slug));
      if (!cat) continue;
      const [used] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(s.products)
        .where(eq(s.products.categoryId, cat.id));
      const [kids] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(s.categories)
        .where(eq(s.categories.parentId, cat.id));
      if ((used?.n ?? 0) === 0 && (kids?.n ?? 0) === 0)
        await db.delete(s.categories).where(eq(s.categories.id, cat.id));
    }

    /* 3. Products, categories interleaved so "New arrivals" (newest first) is a mix. */
    const created = new Map<string, string>();
    for (const item of interleaved()) {
      const category = CATALOG_CATEGORIES.find((c) => c.slug === item.category)!;
      const images = [];
      for (const n of [item.photo, ...(item.extra ?? [])]) {
        const stored = await processAndStoreImage(
          storage,
          await preparePhoto(photoFor(item.category, n)),
          "products",
        );
        images.push({ ...stored, alt: images.length === 0 ? item.name : `${item.name}, another view` });
      }
      const input: ProductInput = {
        name: item.name,
        slug: slugify(item.name),
        description: item.description,
        categoryId: ids.get(TARGET[item.category] ?? item.category)!,
        pricePkr: category.pricePkr,
        salePricePkr: null,
        stockStatus: "in_stock",
        badge: null,
        collabPartner: null,
        colors: item.colors,
        isVisible: true,
        featured: false,
        sizes: category.sized
          ? FOOTWEAR_SIZES.map((label) => ({
              label,
              isAvailable: true,
              stockQuantity: STOCK_EACH,
              stockBase: null,
            }))
          : [],
        trackStock: true,
        stockQuantity: category.sized ? null : STOCK_EACH,
        stockBase: null,
        images: images.map((i) => ({
          storageKey: i.storageKey,
          widths: i.widths,
          width: i.width,
          height: i.height,
          blurDataUrl: i.blurDataUrl,
          alt: i.alt,
        })),
      };
      created.set(item.name, (await createProduct(db, input)).id);
      process.stdout.write(".");
    }
    console.log(`\nImported ${created.size} products`);

    // Homepage featured order, as listed in the catalogue.
    await db
      .update(s.products)
      .set({ featuredRank: null })
      .where(sql`${s.products.featuredRank} is not null`);
    for (const item of CATALOG.filter((i) => i.featured)) {
      await db
        .update(s.products)
        .set({ featuredRank: item.featured! })
        .where(eq(s.products.id, created.get(item.name)!));
    }

    /* 4. Banner, size chart, About text. */
    const [settings] = await db.select().from(s.siteSettings).where(eq(s.siteSettings.id, 1));
    const banner = await processAndStoreImage(
      storage,
      await preparePhoto(photoFor(BANNER.category, BANNER.photo)),
      "banners",
    );
    await db
      .update(s.siteSettings)
      .set({
        heroImageKey: banner.storageKey,
        heroImageWidths: banner.widths,
        heroImageWidth: banner.width,
        heroImageHeight: banner.height,
        heroImageBlurDataUrl: banner.blurDataUrl,
        heroImageAlt: BANNER.alt,
        ...(settings && !settings.sizeChart.some((r) => r.eu === "35") ? { sizeChart: SEED_SIZE_CHART } : {}),
        ...(settings?.aboutBody.includes("wallets, jewellery, phone cases")
          ? {
              aboutBody: settings.aboutBody.replace(
                "heels, sneakers, flats, bags, wallets, jewellery, phone cases and clothing",
                "heels, flats, sneakers, bags, tees, hoodies and watches",
              ),
            }
          : {}),
      })
      .where(eq(s.siteSettings.id, 1));
    if (settings?.heroImageKey) {
      await deleteStored(storage, [{ storageKey: settings.heroImageKey, widths: settings.heroImageWidths }]);
    }

    /* 5. Instagram grid (links to the profile). */
    for (const [position, pick] of INSTAGRAM_PICKS.entries()) {
      const square = await sharp(await preparePhoto(photoFor(pick.category, pick.photo)))
        .resize(1080, 1080, { fit: "cover", position: "attention" })
        .jpeg({ quality: 90 })
        .toBuffer();
      const img = await processAndStoreImage(storage, new Uint8Array(square), "instagram");
      await db.insert(s.instagramPosts).values({
        postUrl: "https://www.instagram.com/usbaofficial/",
        storageKey: img.storageKey,
        widths: img.widths,
        width: img.width,
        height: img.height,
        blurDataUrl: img.blurDataUrl,
        alt: pick.alt,
        position,
      });
    }
    console.log("Banner, size chart and Instagram grid updated");
  } finally {
    await client.end();
  }
}

/**
 * Spreads every category evenly over the import order (by its position within
 * the category), so the newest products, shown first, come from every category.
 */
function interleaved() {
  const rank = (item: (typeof CATALOG)[number]) => {
    const same = CATALOG.filter((i) => i.category === item.category);
    return (same.indexOf(item) + 1) / same.length;
  };
  return [...CATALOG].sort((a, b) => rank(a) - rank(b));
}

async function upsertCategory(
  db: ReturnType<typeof connect>["db"],
  c: { slug: string; name: string; description: string },
  parentId: string | null,
  position: number,
): Promise<string> {
  const [existing] = await db
    .select({ id: s.categories.id })
    .from(s.categories)
    .where(eq(s.categories.slug, c.slug));
  if (existing) {
    await db
      .update(s.categories)
      .set({ name: c.name, description: c.description, parentId, position })
      .where(eq(s.categories.id, existing.id));
    return existing.id;
  }
  const [row] = await db
    .insert(s.categories)
    .values({ slug: c.slug, name: c.name, description: c.description, parentId, position })
    .returning({ id: s.categories.id });
  return row!.id;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
