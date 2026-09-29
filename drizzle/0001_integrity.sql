-- Image positions are unique per product. DEFERRABLE so a reorder can swap
-- positions inside one transaction. Combined with the 0..5 position CHECK
-- this caps every product at 6 images at the database level (AS-03).
ALTER TABLE "product_images"
  ADD CONSTRAINT "product_images_product_position_key"
  UNIQUE ("product_id", "position") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
-- Size positions likewise.
CREATE INDEX IF NOT EXISTS "product_sizes_product_position_idx" ON "product_sizes" ("product_id", "position");
--> statement-breakpoint
-- The settings table always has exactly one row.
INSERT INTO "site_settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
