import "server-only";
import { asc, desc, eq, sql } from "drizzle-orm";
import type { ReviewSource, ReviewStatus } from "@/domain/reviews";
import type { Database } from "../db/client";
import { products, reviews } from "../db/schema";
import { processAndStoreImage, imageObjectKeys } from "../images/pipeline";
import type { ObjectStorage } from "../storage/types";
import { AdminError } from "./errors";

export const REVIEWS_PAGE_SIZE = 12;

export interface AdminReviewRow {
  id: string;
  customerName: string;
  body: string;
  rating: number | null;
  status: ReviewStatus;
  source: ReviewSource;
  createdAt: Date;
  productName: string | null;
  photo: { storageKey: string; widths: number[] } | null;
}

export async function reviewCounts(database: Database): Promise<Record<ReviewStatus, number>> {
  const rows = await database
    .select({ status: reviews.status, count: sql<number>`count(*)::int` })
    .from(reviews)
    .groupBy(reviews.status);
  const out: Record<ReviewStatus, number> = { pending: 0, approved: 0, rejected: 0 };
  for (const r of rows) out[r.status] = r.count;
  return out;
}

export async function listReviews(
  database: Database,
  filters: { status: ReviewStatus; page?: number; pageSize?: number },
): Promise<{ rows: AdminReviewRow[]; total: number; page: number; pageSize: number }> {
  const pageSize = filters.pageSize ?? REVIEWS_PAGE_SIZE;
  const [countRow] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(reviews)
    .where(eq(reviews.status, filters.status));
  const total = countRow?.count ?? 0;
  const page = Math.min(Math.max(1, filters.page ?? 1), Math.max(1, Math.ceil(total / pageSize)));
  const rows = await database
    .select({
      id: reviews.id,
      customerName: reviews.customerName,
      body: reviews.body,
      rating: reviews.rating,
      status: reviews.status,
      source: reviews.source,
      createdAt: reviews.createdAt,
      productName: products.name,
      photoKey: reviews.photoKey,
      photoWidths: reviews.photoWidths,
    })
    .from(reviews)
    .leftJoin(products, eq(products.id, reviews.productId))
    .where(eq(reviews.status, filters.status))
    // Oldest pending first so nothing gets buried; newest first elsewhere.
    .orderBy(filters.status === "pending" ? asc(reviews.createdAt) : desc(reviews.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return {
    total,
    page,
    pageSize,
    rows: rows.map((r) => ({
      id: r.id,
      customerName: r.customerName,
      body: r.body,
      rating: r.rating,
      status: r.status,
      source: r.source,
      createdAt: r.createdAt,
      productName: r.productName,
      photo: r.photoKey ? { storageKey: r.photoKey, widths: r.photoWidths ?? [] } : null,
    })),
  };
}

export async function setReviewStatus(database: Database, id: string, status: ReviewStatus): Promise<void> {
  const updated = await database
    .update(reviews)
    .set({ status, moderatedAt: status === "pending" ? null : new Date() })
    .where(eq(reviews.id, id))
    .returning({ id: reviews.id });
  if (updated.length === 0) throw new AdminError("This review no longer exists.");
}

export async function deleteReview(database: Database, storage: ObjectStorage, id: string): Promise<void> {
  const [row] = await database
    .delete(reviews)
    .where(eq(reviews.id, id))
    .returning({ photoKey: reviews.photoKey, photoWidths: reviews.photoWidths });
  if (!row) throw new AdminError("This review no longer exists.");
  if (row.photoKey) {
    await storage
      .deleteMany(imageObjectKeys(row.photoKey, row.photoWidths ?? []))
      .catch((err) => console.error("Failed to delete review photo (orphan remains)", err));
  }
}

export async function createAdminReview(
  database: Database,
  storage: ObjectStorage,
  input: { customerName: string; body: string; rating: number | null; productId: string | null },
  photo: Uint8Array | null,
): Promise<{ id: string }> {
  const stored = photo ? await processAndStoreImage(storage, photo, "reviews") : null;
  try {
    const [row] = await database
      .insert(reviews)
      .values({
        customerName: input.customerName,
        body: input.body,
        rating: input.rating,
        productId: input.productId,
        photoKey: stored?.storageKey ?? null,
        photoWidths: stored?.widths ?? null,
        photoWidth: stored?.width ?? null,
        photoHeight: stored?.height ?? null,
        photoBlurDataUrl: stored?.blurDataUrl ?? null,
        status: "approved",
        source: "admin",
        moderatedAt: new Date(),
      })
      .returning({ id: reviews.id });
    return { id: row!.id };
  } catch (err) {
    if (stored) await storage.deleteMany(imageObjectKeys(stored.storageKey, stored.widths)).catch(() => {});
    throw err;
  }
}
