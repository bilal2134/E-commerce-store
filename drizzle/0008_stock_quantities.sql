ALTER TABLE "order_items" ADD COLUMN "stock_deducted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "product_sizes" ADD COLUMN "stock_quantity" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock_quantity" integer;--> statement-breakpoint
ALTER TABLE "product_sizes" ADD CONSTRAINT "product_sizes_stock_quantity_non_negative" CHECK ("product_sizes"."stock_quantity" is null or "product_sizes"."stock_quantity" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_stock_quantity_non_negative" CHECK ("products"."stock_quantity" is null or "products"."stock_quantity" >= 0);