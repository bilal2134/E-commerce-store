CREATE SEQUENCE "public"."order_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."product_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_format" CHECK ("categories"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "categories_slug_not_reserved" CHECK ("categories"."slug" not in ('collab', 'sale')),
	CONSTRAINT "categories_not_own_parent" CHECK ("categories"."parent_id" is null or "categories"."parent_id" <> "categories"."id")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name" text NOT NULL,
	"product_code" text NOT NULL,
	"size" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_pkr" integer NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_price_non_negative" CHECK ("order_items"."unit_price_pkr" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_status_events_to_valid" CHECK (to_status in ('received', 'processing', 'shipped', 'delivered', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text DEFAULT 'ORD-' || lpad(nextval('order_code_seq')::text, 4, '0') NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_status_valid" CHECK (status in ('received', 'processing', 'shipped', 'delivered', 'cancelled')),
	CONSTRAINT "orders_channel_valid" CHECK (channel in ('whatsapp', 'instagram', 'other')),
	CONSTRAINT "orders_customer_name_not_blank" CHECK (length(trim("orders"."customer_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"storage_key" text NOT NULL,
	"widths" integer[] NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"blur_data_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_position_range" CHECK ("product_images"."position" >= 0 and "product_images"."position" < 6),
	CONSTRAINT "product_images_dimensions_positive" CHECK ("product_images"."width" > 0 and "product_images"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "product_sizes" (
	"product_id" uuid NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	CONSTRAINT "product_sizes_product_id_label_pk" PRIMARY KEY("product_id","label"),
	CONSTRAINT "product_sizes_label_not_blank" CHECK (length(trim("product_sizes"."label")) > 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text DEFAULT 'USBA-' || lpad(nextval('product_code_seq')::text, 3, '0') NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category_id" uuid NOT NULL,
	"price_pkr" integer NOT NULL,
	"sale_price_pkr" integer,
	"stock_status" text DEFAULT 'in_stock' NOT NULL,
	"badge" text,
	"collab_partner" text,
	"colors" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_visible" boolean DEFAULT false NOT NULL,
	"featured_rank" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_format" CHECK ("products"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "products_price_positive" CHECK ("products"."price_pkr" > 0),
	CONSTRAINT "products_sale_price_valid" CHECK ("products"."sale_price_pkr" is null or ("products"."sale_price_pkr" > 0 and "products"."sale_price_pkr" < "products"."price_pkr")),
	CONSTRAINT "products_stock_status_valid" CHECK (stock_status in ('in_stock', 'out_of_stock', 'preorder')),
	CONSTRAINT "products_badge_valid" CHECK (badge is null or badge in ('new_arrival', 'bestseller', 'trending', 'collab', 'sale', 'viral', 'buy_2_get_1')),
	CONSTRAINT "products_colors_valid" CHECK (colors <@ array['black', 'white', 'cream', 'brown', 'red', 'pink', 'purple', 'blue', 'green', 'yellow', 'gold', 'silver', 'multicolor']::text[]),
	CONSTRAINT "products_name_not_blank" CHECK (length(trim("products"."name")) > 0),
	CONSTRAINT "products_collab_partner_format" CHECK ("products"."collab_partner" is null or "products"."collab_partner" ~ '^[A-Za-z0-9._]{1,30}$')
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" text NOT NULL,
	"body" text NOT NULL,
	"rating" smallint,
	"product_id" uuid,
	"photo_key" text,
	"photo_widths" integer[],
	"photo_width" integer,
	"photo_height" integer,
	"photo_blur_data_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"moderated_at" timestamp with time zone,
	CONSTRAINT "reviews_status_valid" CHECK (status in ('pending', 'approved', 'rejected')),
	CONSTRAINT "reviews_source_valid" CHECK (source in ('admin', 'customer')),
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" is null or "reviews"."rating" between 1 and 5),
	CONSTRAINT "reviews_body_length" CHECK (length("reviews"."body") between 1 and 2000),
	CONSTRAINT "reviews_customer_name_length" CHECK (length("reviews"."customer_name") between 1 and 80)
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"whatsapp_number" text DEFAULT '' NOT NULL,
	"instagram_handle" text DEFAULT '' NOT NULL,
	"collab_instagram_handle" text DEFAULT '' NOT NULL,
	"announcement_enabled" boolean DEFAULT false NOT NULL,
	"announcement_text" text DEFAULT '' NOT NULL,
	"announcement_href" text DEFAULT '' NOT NULL,
	"hero_eyebrow" text DEFAULT '' NOT NULL,
	"hero_title" text DEFAULT '' NOT NULL,
	"hero_subtitle" text DEFAULT '' NOT NULL,
	"hero_cta_label" text DEFAULT '' NOT NULL,
	"hero_cta_href" text DEFAULT '' NOT NULL,
	"hero_image_key" text,
	"hero_image_widths" integer[],
	"hero_image_width" integer,
	"hero_image_height" integer,
	"hero_image_blur_data_url" text,
	"hero_image_alt" text DEFAULT '' NOT NULL,
	"collab_title" text DEFAULT '' NOT NULL,
	"collab_body" text DEFAULT '' NOT NULL,
	"delivery_summary" text DEFAULT '' NOT NULL,
	"delivery_details" text DEFAULT '' NOT NULL,
	"preorder_note" text DEFAULT '' NOT NULL,
	"about_body" text DEFAULT '' NOT NULL,
	"faq" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"size_chart" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"size_guide_note" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_singleton" CHECK ("site_settings"."id" = 1),
	CONSTRAINT "site_settings_whatsapp_format" CHECK ("site_settings"."whatsapp_number" = '' or "site_settings"."whatsapp_number" ~ '^[1-9][0-9]{7,14}$')
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sizes" ADD CONSTRAINT "product_sizes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_sessions_admin_idx" ON "admin_sessions" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "admin_sessions_expires_idx" ON "admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_key" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id","position");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_status_events_order_idx" ON "order_status_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_code_key" ON "orders" USING btree ("code");--> statement-breakpoint
CREATE INDEX "orders_status_created_idx" ON "orders" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_storage_key_key" ON "product_images" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "products_code_key" ON "products" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_key" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_visible_created_idx" ON "products" USING btree ("is_visible","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "products_featured_idx" ON "products" USING btree ("featured_rank") WHERE "products"."featured_rank" is not null;--> statement-breakpoint
CREATE INDEX "rate_limits_window_idx" ON "rate_limits" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "reviews_status_created_idx" ON "reviews" USING btree ("status","created_at" DESC NULLS LAST);