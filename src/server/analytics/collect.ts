import "server-only";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ANALYTICS_EVENT_TYPES, ANALYTICS_RETENTION_DAYS } from "@/domain/analytics";
import type { Database } from "../db/client";
import { analyticsEvents, categories, products } from "../db/schema";

export const MAX_BODY_BYTES = 2048;

const slug = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const eventBodySchema = z.object({
  type: z.enum(ANALYTICS_EVENT_TYPES),
  productCode: z
    .string()
    .max(20)
    .regex(/^[A-Z0-9-]+$/)
    .optional(),
  productSlug: slug.optional(),
  categorySlug: slug.optional(),
});
export type EventBody = z.infer<typeof eventBodySchema>;

const COLLECTION_SLUGS = new Set(["sale", "collab"]);

/**
 * Stores one event. Unknown products/categories resolve to null; a product or
 * category view with nothing to attribute it to is dropped as noise.
 * Returns whether a row was written.
 */
export async function recordEvent(
  database: Database,
  body: EventBody,
  visitorHash: string,
): Promise<boolean> {
  let productId: string | null = null;
  if (body.productCode || body.productSlug) {
    const [row] = await database
      .select({ id: products.id })
      .from(products)
      .where(body.productCode ? eq(products.code, body.productCode) : eq(products.slug, body.productSlug!))
      .limit(1);
    productId = row?.id ?? null;
  }

  let categorySlug: string | null = null;
  if (body.categorySlug) {
    if (COLLECTION_SLUGS.has(body.categorySlug)) {
      categorySlug = body.categorySlug;
    } else {
      const [row] = await database
        .select({ slug: categories.slug })
        .from(categories)
        .where(eq(categories.slug, body.categorySlug))
        .limit(1);
      categorySlug = row?.slug ?? null;
    }
  }

  if (body.type === "product_view" && !productId) return false;
  if (body.type === "category_view" && !categorySlug) return false;

  // Idempotent per visitor/event/target/day (unique index): repeats and floods
  // can neither inflate counts nor grow the table.
  const inserted = await database
    .insert(analyticsEvents)
    .values({
      type: body.type,
      productId,
      categorySlug: body.type === "category_view" ? categorySlug : null,
      visitorDayHash: visitorHash,
    })
    .onConflictDoNothing()
    .returning({ id: analyticsEvents.id });
  return inserted.length > 0;
}

/** Housekeeping: drop events past the retention window. Called opportunistically. */
export async function pruneAnalyticsEvents(database: Database): Promise<void> {
  await database.execute(
    sql`delete from analytics_events where created_at < now() - make_interval(days => ${ANALYTICS_RETENTION_DAYS})`,
  );
}
