-- Aurora DSQL baseline schema (ADR 0014). Equivalent to drizzle/0000..0007 on
-- PostgreSQL; generated from that schema and checked by
-- tests/integration/dsql-baseline.test.ts. DSQL differences: indexes are
-- CREATE INDEX ASYNC (no USING/DESC), constraints are inline, sequences state
-- CACHE explicitly. One statement per transaction (scripts/migrate-dsql.ts).
CREATE SEQUENCE IF NOT EXISTS order_code_seq CACHE 1;
--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS product_code_seq CACHE 1;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  name text DEFAULT ''::text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  last_login_at timestamp with time zone,
  CONSTRAINT admin_users_pkey PRIMARY KEY (id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS admin_sessions (
  id text NOT NULL,
  admin_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
  user_agent text DEFAULT ''::text NOT NULL,
  CONSTRAINT admin_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT admin_sessions_admin_id_admin_users_id_fk FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  parent_id uuid,
  slug text NOT NULL,
  name text NOT NULL,
  description text DEFAULT ''::text NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT categories_not_own_parent CHECK (((parent_id IS NULL) OR (parent_id <> id))),
  CONSTRAINT categories_slug_format CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
  CONSTRAINT categories_slug_not_reserved CHECK ((slug <> ALL (ARRAY['collab'::text, 'sale'::text]))),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_categories_id_fk FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS products (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text DEFAULT ('USBA-'::text || lpad((nextval('public.product_code_seq'::regclass))::text, 3, '0'::text)) NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  category_id uuid NOT NULL,
  price_pkr integer NOT NULL,
  sale_price_pkr integer,
  stock_status text DEFAULT 'in_stock'::text NOT NULL,
  badge text,
  collab_partner text,
  colors jsonb DEFAULT '[]'::jsonb NOT NULL,
  is_visible boolean DEFAULT false NOT NULL,
  featured_rank integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT products_badge_valid CHECK (((badge IS NULL) OR (badge = ANY (ARRAY['new_arrival'::text, 'bestseller'::text, 'trending'::text, 'collab'::text, 'sale'::text, 'viral'::text, 'buy_2_get_1'::text])))),
  CONSTRAINT products_collab_partner_format CHECK (((collab_partner IS NULL) OR (collab_partner ~ '^[A-Za-z0-9._]{1,30}$'::text))),
  CONSTRAINT products_colors_valid CHECK (((jsonb_typeof(colors) = 'array'::text) AND (colors <@ '["black", "white", "cream", "brown", "red", "pink", "purple", "blue", "green", "yellow", "gold", "silver", "multicolor"]'::jsonb))),
  CONSTRAINT products_name_not_blank CHECK ((length(TRIM(BOTH FROM name)) > 0)),
  CONSTRAINT products_price_positive CHECK ((price_pkr > 0)),
  CONSTRAINT products_sale_price_valid CHECK (((sale_price_pkr IS NULL) OR ((sale_price_pkr > 0) AND (sale_price_pkr < price_pkr)))),
  CONSTRAINT products_slug_format CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
  CONSTRAINT products_stock_status_valid CHECK ((stock_status = ANY (ARRAY['in_stock'::text, 'out_of_stock'::text, 'preorder'::text]))),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS analytics_events (
  id bigint NOT NULL GENERATED ALWAYS AS IDENTITY (CACHE 65536),
  type text NOT NULL,
  product_id uuid,
  category_slug text,
  visitor_day_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  day date DEFAULT ((now() AT TIME ZONE 'utc'::text))::date NOT NULL,
  CONSTRAINT analytics_events_type_valid CHECK ((type = ANY (ARRAY['product_view'::text, 'category_view'::text, 'search'::text, 'whatsapp_order_click'::text, 'instagram_order_click'::text]))),
  CONSTRAINT analytics_events_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_events_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS instagram_posts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  post_url text NOT NULL,
  storage_key text NOT NULL,
  widths jsonb NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  blur_data_url text,
  alt text DEFAULT ''::text NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT instagram_posts_url_format CHECK ((post_url ~ '^https://www.instagram.com/'::text)),
  CONSTRAINT instagram_posts_pkey PRIMARY KEY (id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text DEFAULT ('ORD-'::text || lpad((nextval('public.order_code_seq'::regclass))::text, 4, '0'::text)) NOT NULL,
  channel text DEFAULT 'whatsapp'::text NOT NULL,
  status text DEFAULT 'received'::text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  notes text DEFAULT ''::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT orders_channel_valid CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'instagram'::text, 'other'::text]))),
  CONSTRAINT orders_customer_name_not_blank CHECK ((length(TRIM(BOTH FROM customer_name)) > 0)),
  CONSTRAINT orders_status_valid CHECK ((status = ANY (ARRAY['received'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text]))),
  CONSTRAINT orders_pkey PRIMARY KEY (id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS order_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  product_id uuid,
  product_name text NOT NULL,
  product_code text NOT NULL,
  size text,
  quantity integer DEFAULT 1 NOT NULL,
  unit_price_pkr integer NOT NULL,
  CONSTRAINT order_items_price_non_negative CHECK ((unit_price_pkr >= 0)),
  CONSTRAINT order_items_quantity_positive CHECK ((quantity > 0)),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT order_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS order_status_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  note text DEFAULT ''::text NOT NULL,
  admin_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT order_status_events_to_valid CHECK ((to_status = ANY (ARRAY['received'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text]))),
  CONSTRAINT order_status_events_pkey PRIMARY KEY (id),
  CONSTRAINT order_status_events_admin_id_admin_users_id_fk FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT order_status_events_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS product_images (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id uuid NOT NULL,
  "position" integer NOT NULL,
  storage_key text NOT NULL,
  widths jsonb NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  alt text DEFAULT ''::text NOT NULL,
  blur_data_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT product_images_dimensions_positive CHECK (((width > 0) AND (height > 0))),
  CONSTRAINT product_images_position_range CHECK ((("position" >= 0) AND ("position" < 6))),
  CONSTRAINT product_images_pkey PRIMARY KEY (id),
  CONSTRAINT product_images_product_position_key UNIQUE (product_id, "position"),
  CONSTRAINT product_images_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS product_sizes (
  product_id uuid NOT NULL,
  label text NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  is_available boolean DEFAULT true NOT NULL,
  CONSTRAINT product_sizes_label_not_blank CHECK ((length(TRIM(BOTH FROM label)) > 0)),
  CONSTRAINT product_sizes_product_id_label_pk PRIMARY KEY (product_id, label),
  CONSTRAINT product_sizes_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS rate_limits (
  key text NOT NULL,
  window_start timestamp with time zone NOT NULL,
  count integer DEFAULT 0 NOT NULL,
  CONSTRAINT rate_limits_key_window_start_pk PRIMARY KEY (key, window_start)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS reviews (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_name text NOT NULL,
  body text NOT NULL,
  rating smallint,
  product_id uuid,
  photo_key text,
  photo_widths jsonb,
  photo_width integer,
  photo_height integer,
  photo_blur_data_url text,
  status text DEFAULT 'pending'::text NOT NULL,
  source text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  moderated_at timestamp with time zone,
  CONSTRAINT reviews_body_length CHECK (((length(body) >= 1) AND (length(body) <= 2000))),
  CONSTRAINT reviews_customer_name_length CHECK (((length(customer_name) >= 1) AND (length(customer_name) <= 80))),
  CONSTRAINT reviews_rating_range CHECK (((rating IS NULL) OR ((rating >= 1) AND (rating <= 5)))),
  CONSTRAINT reviews_source_valid CHECK ((source = ANY (ARRAY['admin'::text, 'customer'::text]))),
  CONSTRAINT reviews_status_valid CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS site_settings (
  id smallint DEFAULT 1 NOT NULL,
  whatsapp_number text DEFAULT ''::text NOT NULL,
  instagram_handle text DEFAULT ''::text NOT NULL,
  collab_instagram_handle text DEFAULT ''::text NOT NULL,
  announcement_enabled boolean DEFAULT false NOT NULL,
  announcement_text text DEFAULT ''::text NOT NULL,
  announcement_href text DEFAULT ''::text NOT NULL,
  hero_eyebrow text DEFAULT ''::text NOT NULL,
  hero_title text DEFAULT ''::text NOT NULL,
  hero_subtitle text DEFAULT ''::text NOT NULL,
  hero_cta_label text DEFAULT ''::text NOT NULL,
  hero_cta_href text DEFAULT ''::text NOT NULL,
  hero_image_key text,
  hero_image_widths jsonb,
  hero_image_width integer,
  hero_image_height integer,
  hero_image_blur_data_url text,
  hero_image_alt text DEFAULT ''::text NOT NULL,
  collab_title text DEFAULT ''::text NOT NULL,
  collab_body text DEFAULT ''::text NOT NULL,
  delivery_summary text DEFAULT ''::text NOT NULL,
  delivery_details text DEFAULT ''::text NOT NULL,
  preorder_note text DEFAULT ''::text NOT NULL,
  about_body text DEFAULT ''::text NOT NULL,
  faq jsonb DEFAULT '[]'::jsonb NOT NULL,
  size_chart jsonb DEFAULT '[]'::jsonb NOT NULL,
  size_guide_note text DEFAULT ''::text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  localized jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT site_settings_singleton CHECK ((id = 1)),
  CONSTRAINT site_settings_whatsapp_format CHECK (((whatsapp_number = ''::text) OR (whatsapp_number ~ '^[1-9][0-9]{7,14}$'::text))),
  CONSTRAINT site_settings_pkey PRIMARY KEY (id)
);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS admin_sessions_admin_idx ON admin_sessions (admin_id);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS admin_sessions_expires_idx ON admin_sessions (expires_at);
--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC IF NOT EXISTS admin_users_email_key ON admin_users (lower(email));
--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC IF NOT EXISTS analytics_events_dedupe_key ON analytics_events (type, product_id, category_slug, visitor_day_hash, day) NULLS NOT DISTINCT;
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS analytics_events_product_created_idx ON analytics_events (product_id, created_at);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS analytics_events_type_created_idx ON analytics_events (type, created_at);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS categories_parent_idx ON categories (parent_id, "position");
--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC IF NOT EXISTS categories_slug_key ON categories (slug);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS instagram_posts_position_idx ON instagram_posts ("position");
--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC IF NOT EXISTS instagram_posts_storage_key_key ON instagram_posts (storage_key);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS order_items_order_idx ON order_items (order_id);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS order_items_product_idx ON order_items (product_id);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS order_status_events_order_idx ON order_status_events (order_id, created_at);
--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC IF NOT EXISTS orders_code_key ON orders (code);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS orders_created_idx ON orders (created_at);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS orders_status_created_idx ON orders (status, created_at);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS product_images_product_idx ON product_images (product_id, "position");
--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC IF NOT EXISTS product_images_storage_key_key ON product_images (storage_key);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS product_sizes_product_position_idx ON product_sizes (product_id, "position");
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS products_category_idx ON products (category_id);
--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC IF NOT EXISTS products_code_key ON products (code);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS products_featured_idx ON products (featured_rank) WHERE (featured_rank IS NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX ASYNC IF NOT EXISTS products_slug_key ON products (slug);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS products_visible_created_idx ON products (is_visible, created_at);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS rate_limits_window_idx ON rate_limits (window_start);
--> statement-breakpoint
CREATE INDEX ASYNC IF NOT EXISTS reviews_status_created_idx ON reviews (status, created_at);
--> statement-breakpoint
INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
