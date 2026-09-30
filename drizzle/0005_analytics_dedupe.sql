ALTER TABLE "analytics_events" ADD COLUMN "day" date DEFAULT (now() at time zone 'utc')::date NOT NULL;--> statement-breakpoint
-- Existing rows: derive the day from created_at, then keep one row per
-- (type, product, category, visitor, day) before adding the unique index.
UPDATE "analytics_events" SET "day" = ("created_at" at time zone 'utc')::date;
--> statement-breakpoint
DELETE FROM "analytics_events" a USING "analytics_events" b
WHERE a."id" > b."id"
  AND a."type" = b."type"
  AND a."product_id" IS NOT DISTINCT FROM b."product_id"
  AND a."category_slug" IS NOT DISTINCT FROM b."category_slug"
  AND a."visitor_day_hash" = b."visitor_day_hash"
  AND a."day" = b."day";
--> statement-breakpoint
-- One row per visitor/event/target/day: repeat posts (or a flood of them) can't
-- inflate counts or grow the table. Requires PostgreSQL 15+ (NULLS NOT DISTINCT).
CREATE UNIQUE INDEX "analytics_events_dedupe_key" ON "analytics_events"
  ("type", "product_id", "category_slug", "visitor_day_hash", "day") NULLS NOT DISTINCT;
