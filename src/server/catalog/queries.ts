import "server-only";
import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Badge, Color, StockStatus } from "@/domain/catalog";
import type { ResponsiveImage } from "@/domain/images";
import type { Catalog, CategoryTree } from "@/domain/category";
import { defaultImageAlt, type ProductCard, type ProductDetail } from "@/domain/product";
import { visibleRemaining } from "@/domain/stock";
import type { Database } from "../db/client";
import {
  categories,
  instagramPosts,
  productImages,
  products,
  productSizes,
  reviews,
  siteSettings,
} from "../db/schema";

/**
 * Raw read queries. Pure data access (no Next.js caching) so they can be
 * integration-tested directly; src/server/catalog/public.ts wraps them in
 * `use cache` for the storefront.
 */

export interface QueryContext {
  db: Database;
  /** Maps a storage key to its public base URL. */
  mediaUrl: (storageKey: string) => string;
}

interface ImageRow {
  storageKey: string;
  widths: number[];
  width: number;
  height: number;
  alt: string;
  blurDataUrl: string | null;
}

export function toResponsiveImage(
  ctx: Pick<QueryContext, "mediaUrl">,
  row: ImageRow,
  fallbackAlt: string,
): ResponsiveImage {
  return {
    baseUrl: ctx.mediaUrl(row.storageKey),
    widths: [...row.widths].sort((a, b) => a - b),
    width: row.width,
    height: row.height,
    alt: row.alt.trim() || fallbackAlt,
    blurDataUrl: row.blurDataUrl,
  };
}

export async function fetchCategoryTree(ctx: QueryContext): Promise<CategoryTree[]> {
  const rows = await ctx.db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      parentId: categories.parentId,
      position: categories.position,
    })
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.name));
  const roots = rows.filter((r) => r.parentId === null);
  return roots.map((root) => ({ ...root, children: rows.filter((r) => r.parentId === root.id) }));
}

const parentCategory = alias(categories, "parent_category");

/** Every visible product as a card, with its first two images. */
export async function fetchVisibleProductCards(ctx: QueryContext): Promise<ProductCard[]> {
  const rows = await ctx.db
    .select({
      id: products.id,
      code: products.code,
      slug: products.slug,
      name: products.name,
      categorySlug: categories.slug,
      categoryName: categories.name,
      rootCategorySlug: sql<string>`coalesce(${parentCategory.slug}, ${categories.slug})`,
      pricePkr: products.pricePkr,
      salePricePkr: products.salePricePkr,
      stockStatus: products.stockStatus,
      badge: products.badge,
      collabPartner: products.collabPartner,
      colors: products.colors,
      createdAt: products.createdAt,
      featuredRank: products.featuredRank,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(parentCategory, eq(parentCategory.id, categories.parentId))
    .where(eq(products.isVisible, true))
    .orderBy(desc(products.createdAt));

  if (rows.length === 0) return [];

  const images = await ctx.db
    .select({
      productId: productImages.productId,
      position: productImages.position,
      storageKey: productImages.storageKey,
      widths: productImages.widths,
      width: productImages.width,
      height: productImages.height,
      alt: productImages.alt,
      blurDataUrl: productImages.blurDataUrl,
    })
    .from(productImages)
    .where(
      and(
        inArray(
          productImages.productId,
          rows.map((r) => r.id),
        ),
        lt(productImages.position, 2),
      ),
    )
    .orderBy(asc(productImages.productId), asc(productImages.position));

  const byProduct = new Map<string, ImageRow[]>();
  for (const img of images) {
    const list = byProduct.get(img.productId) ?? [];
    list.push(img);
    byProduct.set(img.productId, list);
  }

  return rows.map((r) => {
    const imgs = byProduct.get(r.id) ?? [];
    const first = imgs[0];
    const second = imgs[1];
    return {
      ...r,
      stockStatus: r.stockStatus as StockStatus,
      badge: (r.badge ?? null) as Badge | null,
      colors: r.colors as Color[],
      createdAt: r.createdAt.toISOString(),
      image: first ? toResponsiveImage(ctx, first, r.name) : null,
      hoverImage: second ? toResponsiveImage(ctx, second, `${r.name} — alternate view`) : null,
    };
  });
}

export async function fetchCatalog(ctx: QueryContext): Promise<Catalog> {
  const [tree, cards] = await Promise.all([fetchCategoryTree(ctx), fetchVisibleProductCards(ctx)]);
  return { categories: tree, products: cards };
}

/** Full product for the detail page; null when missing or hidden. */
export async function fetchVisibleProductBySlug(
  ctx: QueryContext,
  slug: string,
): Promise<ProductDetail | null> {
  const [row] = await ctx.db
    .select({
      id: products.id,
      code: products.code,
      slug: products.slug,
      name: products.name,
      description: products.description,
      categorySlug: categories.slug,
      categoryName: categories.name,
      rootCategorySlug: sql<string>`coalesce(${parentCategory.slug}, ${categories.slug})`,
      rootCategoryName: sql<string>`coalesce(${parentCategory.name}, ${categories.name})`,
      pricePkr: products.pricePkr,
      salePricePkr: products.salePricePkr,
      stockStatus: products.stockStatus,
      stockQuantity: products.stockQuantity,
      badge: products.badge,
      collabPartner: products.collabPartner,
      colors: products.colors,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      featuredRank: products.featuredRank,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(parentCategory, eq(parentCategory.id, categories.parentId))
    .where(and(eq(products.slug, slug), eq(products.isVisible, true)))
    .limit(1);
  if (!row) return null;

  const [imageRows, sizeRows] = await Promise.all([
    ctx.db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, row.id))
      .orderBy(asc(productImages.position)),
    ctx.db
      .select({
        label: productSizes.label,
        isAvailable: productSizes.isAvailable,
        stockQuantity: productSizes.stockQuantity,
      })
      .from(productSizes)
      .where(eq(productSizes.productId, row.id))
      .orderBy(asc(productSizes.position), asc(productSizes.label)),
  ]);

  const images = imageRows.map((img, i) =>
    toResponsiveImage(ctx, img, defaultImageAlt(row.name, i, imageRows.length)),
  );

  // Exact counts stay on the server; only a low count reaches the page.
  const { stockQuantity, ...product } = row;
  const stockStatus = row.stockStatus as StockStatus;
  return {
    ...product,
    stockStatus,
    remaining: visibleRemaining(stockQuantity, stockStatus),
    badge: (row.badge ?? null) as Badge | null,
    colors: row.colors as Color[],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    image: images[0] ?? null,
    hoverImage: images[1] ?? null,
    images,
    sizes: sizeRows.map((s) => ({
      label: s.label,
      isAvailable: s.isAvailable,
      remaining: s.isAvailable ? visibleRemaining(s.stockQuantity, stockStatus) : null,
    })),
  };
}

/** Lookup by human product code (USBA-001) for redirects from /product/USBA-001. */
export async function fetchVisibleSlugByCode(ctx: QueryContext, code: string): Promise<string | null> {
  const [row] = await ctx.db
    .select({ slug: products.slug })
    .from(products)
    .where(and(eq(sql`upper(${products.code})`, code.toUpperCase()), eq(products.isVisible, true)))
    .limit(1);
  return row?.slug ?? null;
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

export interface PublicReview {
  id: string;
  customerName: string;
  body: string;
  rating: number | null;
  createdAt: string;
  photo: ResponsiveImage | null;
  product: { name: string; slug: string } | null;
}

export async function fetchApprovedReviews(ctx: QueryContext, limit = 60): Promise<PublicReview[]> {
  const rows = await ctx.db
    .select({
      id: reviews.id,
      customerName: reviews.customerName,
      body: reviews.body,
      rating: reviews.rating,
      createdAt: reviews.createdAt,
      photoKey: reviews.photoKey,
      photoWidths: reviews.photoWidths,
      photoWidth: reviews.photoWidth,
      photoHeight: reviews.photoHeight,
      photoBlurDataUrl: reviews.photoBlurDataUrl,
      productName: products.name,
      productSlug: products.slug,
      productVisible: products.isVisible,
    })
    .from(reviews)
    .leftJoin(products, eq(products.id, reviews.productId))
    .where(eq(reviews.status, "approved"))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    body: r.body,
    rating: r.rating,
    createdAt: r.createdAt.toISOString(),
    photo:
      r.photoKey && r.photoWidths && r.photoWidth && r.photoHeight
        ? toResponsiveImage(
            ctx,
            {
              storageKey: r.photoKey,
              widths: r.photoWidths,
              width: r.photoWidth,
              height: r.photoHeight,
              alt: "",
              blurDataUrl: r.photoBlurDataUrl,
            },
            `Photo shared by ${r.customerName}`,
          )
        : null,
    product:
      r.productName && r.productSlug && r.productVisible
        ? { name: r.productName, slug: r.productSlug }
        : null,
  }));
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export type SettingsRow = typeof siteSettings.$inferSelect;

export interface PublicSettings {
  whatsappNumber: string | null;
  instagramHandle: string | null;
  collabInstagramHandle: string | null;
  announcement: { text: string; href: string | null } | null;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    image: ResponsiveImage | null;
  };
  collab: { title: string; body: string };
  deliverySummary: string;
  deliveryDetails: string;
  preorderNote: string;
  aboutBody: string;
  faq: SettingsRow["faq"];
  sizeChart: SettingsRow["sizeChart"];
  sizeGuideNote: string;
  updatedAt: string;
}

export async function fetchSettingsRow(database: Database): Promise<SettingsRow> {
  const [row] = await database.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
  if (!row) throw new Error("site_settings row missing — run migrations");
  return row;
}

/**
 * Public settings for a locale. Urdu overrides (settings.localized.ur) replace
 * the default text only when filled in; anything left empty falls back.
 */
export function toPublicSettings(
  ctx: Pick<QueryContext, "mediaUrl">,
  row: SettingsRow,
  locale: "en" | "ur" = "en",
): PublicSettings {
  const tr = locale === "en" ? {} : (row.localized?.[locale] ?? {});
  const pick = (base: string, override: string | undefined) => (override?.trim() ? override.trim() : base);
  const announcementText = pick(row.announcementText, tr.announcementText);
  return {
    whatsappNumber: row.whatsappNumber || null,
    instagramHandle: row.instagramHandle || null,
    collabInstagramHandle: row.collabInstagramHandle || null,
    announcement:
      row.announcementEnabled && announcementText.trim()
        ? { text: announcementText.trim(), href: row.announcementHref || null }
        : null,
    hero: {
      eyebrow: pick(row.heroEyebrow, tr.heroEyebrow),
      title: pick(row.heroTitle, tr.heroTitle),
      subtitle: pick(row.heroSubtitle, tr.heroSubtitle),
      ctaLabel: pick(row.heroCtaLabel, tr.heroCtaLabel),
      ctaHref: row.heroCtaHref,
      image:
        row.heroImageKey && row.heroImageWidths && row.heroImageWidth && row.heroImageHeight
          ? toResponsiveImage(
              ctx,
              {
                storageKey: row.heroImageKey,
                widths: row.heroImageWidths,
                width: row.heroImageWidth,
                height: row.heroImageHeight,
                alt: row.heroImageAlt,
                blurDataUrl: row.heroImageBlurDataUrl,
              },
              "USBA featured collection",
            )
          : null,
    },
    collab: { title: pick(row.collabTitle, tr.collabTitle), body: pick(row.collabBody, tr.collabBody) },
    deliverySummary: pick(row.deliverySummary, tr.deliverySummary),
    deliveryDetails: pick(row.deliveryDetails, tr.deliveryDetails),
    preorderNote: pick(row.preorderNote, tr.preorderNote),
    aboutBody: pick(row.aboutBody, tr.aboutBody),
    faq: tr.faq?.length ? tr.faq : row.faq,
    sizeChart: row.sizeChart,
    sizeGuideNote: pick(row.sizeGuideNote, tr.sizeGuideNote),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Slugs + update times for sitemap and generateStaticParams. */
export async function fetchVisibleProductSlugs(
  ctx: QueryContext,
): Promise<{ slug: string; updatedAt: string }[]> {
  const rows = await ctx.db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .where(eq(products.isVisible, true))
    .orderBy(asc(products.slug));
  return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() }));
}

/* ------------------------------------------------------------------ */
/* Instagram (CS-22)                                                   */
/* ------------------------------------------------------------------ */

export interface PublicInstagramPost {
  id: string;
  postUrl: string;
  image: ResponsiveImage;
}

export async function fetchInstagramPosts(ctx: QueryContext, limit = 9): Promise<PublicInstagramPost[]> {
  const rows = await ctx.db
    .select()
    .from(instagramPosts)
    .orderBy(asc(instagramPosts.position), asc(instagramPosts.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    postUrl: r.postUrl,
    image: toResponsiveImage(ctx, r, "USBA Instagram post"),
  }));
}
