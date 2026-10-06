-- Aurora DSQL compatibility (ADR 0014).
-- 1. DSQL can't store array columns, so integer[]/text[] become jsonb arrays.
--    to_jsonb keeps existing values; the app reads/writes them unchanged.
ALTER TABLE "products" DROP CONSTRAINT "products_colors_valid";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "colors" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "colors" SET DATA TYPE jsonb USING to_jsonb("colors");--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "colors" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_colors_valid" CHECK (jsonb_typeof(colors) = 'array' and colors <@ '["black","white","cream","brown","red","pink","purple","blue","green","yellow","gold","silver","multicolor"]'::jsonb);--> statement-breakpoint
ALTER TABLE "instagram_posts" ALTER COLUMN "widths" SET DATA TYPE jsonb USING to_jsonb("widths");--> statement-breakpoint
ALTER TABLE "product_images" ALTER COLUMN "widths" SET DATA TYPE jsonb USING to_jsonb("widths");--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "photo_widths" SET DATA TYPE jsonb USING to_jsonb("photo_widths");--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "hero_image_widths" SET DATA TYPE jsonb USING to_jsonb("hero_image_widths");--> statement-breakpoint
-- 2. DSQL only supports DEFERRABLE on foreign keys. Saving a product deletes and
--    re-inserts its image rows (writeSizesAndImages), so an immediately-checked
--    unique constraint is enough.
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_product_position_key";--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_position_key" UNIQUE ("product_id", "position");
