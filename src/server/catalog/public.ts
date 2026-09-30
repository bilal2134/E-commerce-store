import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Catalog } from "@/domain/category";
import type { ProductDetail } from "@/domain/product";
import type { Locale } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { CACHE_TAGS } from "../cache";
import { db } from "../db/client";
import { mediaBaseUrl } from "../storage";
import {
  fetchApprovedReviews,
  fetchCatalog,
  fetchInstagramPosts,
  fetchSettingsRow,
  fetchVisibleProductBySlug,
  fetchVisibleProductSlugs,
  fetchVisibleSlugByCode,
  toPublicSettings,
  type PublicInstagramPost,
  type PublicReview,
  type PublicSettings,
  type QueryContext,
} from "./queries";

/**
 * Cached storefront reads. Everything here is public data, identical for all
 * visitors, so it is safe to share across requests. The "storefront" cache
 * profile (next.config.ts) is a time-based safety net; admin mutations
 * invalidate these tags explicitly.
 */

function ctx(): QueryContext {
  return { db: db(), mediaUrl: mediaBaseUrl };
}

export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("storefront");
  cacheTag(CACHE_TAGS.catalog);
  return fetchCatalog(ctx());
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("storefront");
  cacheTag(CACHE_TAGS.catalog);
  return fetchVisibleProductBySlug(ctx(), slug);
}

export async function getSlugForCode(code: string): Promise<string | null> {
  "use cache";
  cacheLife("storefront");
  cacheTag(CACHE_TAGS.catalog);
  return fetchVisibleSlugByCode(ctx(), code);
}

export async function getProductSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  "use cache";
  cacheLife("storefront");
  cacheTag(CACHE_TAGS.catalog);
  return fetchVisibleProductSlugs(ctx());
}

export async function getSettings(locale: Locale = "en"): Promise<PublicSettings> {
  "use cache";
  cacheLife("storefront");
  cacheTag(CACHE_TAGS.settings);
  return toPublicSettings(ctx(), await fetchSettingsRow(db()), locale);
}

/** Settings in the current page's locale (storefront Server Components). */
export async function getLocalizedSettings(): Promise<PublicSettings> {
  return getSettings(await getLocale());
}

export async function getApprovedReviews(): Promise<PublicReview[]> {
  "use cache";
  cacheLife("storefront");
  cacheTag(CACHE_TAGS.reviews);
  return fetchApprovedReviews(ctx());
}

/** Curated Instagram posts; edited with settings, so they share the tag. */
export async function getInstagramPosts(): Promise<PublicInstagramPost[]> {
  "use cache";
  cacheLife("storefront");
  cacheTag(CACHE_TAGS.settings);
  return fetchInstagramPosts(ctx());
}

export type { PublicInstagramPost, PublicReview, PublicSettings };
