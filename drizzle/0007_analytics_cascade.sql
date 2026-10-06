ALTER TABLE "analytics_events" DROP CONSTRAINT "analytics_events_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;