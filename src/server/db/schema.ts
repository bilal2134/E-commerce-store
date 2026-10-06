import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { ANALYTICS_EVENT_TYPES } from "../../domain/analytics";
import { BADGES, COLORS, STOCK_STATUSES } from "../../domain/catalog";
import { ORDER_CHANNELS, ORDER_STATUSES } from "../../domain/orders";
import { REVIEW_SOURCES, REVIEW_STATUSES } from "../../domain/reviews";

/**
 * Schema notes
 * - Plain PostgreSQL only (no provider extensions) so the database moves
 *   between local Docker, Supabase, Neon and RDS with pg_dump/restore.
 * - Enumerations are `text` + CHECK constraints (easier to evolve than
 *   Postgres ENUM types); the allowed values come from src/domain.
 * - Money is integer rupees (PKR); see src/domain/money.ts.
 */

const inList = (column: string, values: readonly string[]) =>
  sql.raw(`${column} in (${values.map((v) => `'${v}'`).join(", ")})`);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id"),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("categories_slug_key").on(t.slug),
    index("categories_parent_idx").on(t.parentId, t.position),
    foreignKey({ columns: [t.parentId], foreignColumns: [t.id] }).onDelete("restrict"),
    check("categories_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("categories_slug_not_reserved", sql`${t.slug} not in ('collab', 'sale')`),
    check("categories_not_own_parent", sql`${t.parentId} is null or ${t.parentId} <> ${t.id}`),
  ],
);

export const productCodeSeq = pgSequence("product_code_seq", { startWith: 1 });

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-facing product ID, e.g. USBA-001 (Requirements §11.2). */
    code: text("code")
      .notNull()
      .default(sql`'USBA-' || lpad(nextval('product_code_seq')::text, 3, '0')`),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    pricePkr: integer("price_pkr").notNull(),
    salePricePkr: integer("sale_price_pkr"),
    stockStatus: text("stock_status").$type<(typeof STOCK_STATUSES)[number]>().notNull().default("in_stock"),
    badge: text("badge").$type<(typeof BADGES)[number]>(),
    /** Instagram handle of the collaboration partner, e.g. "fairycoreforher". */
    collabPartner: text("collab_partner"),
    /** JSON array, not text[]: Aurora DSQL can't store array columns (ADR 0014). */
    colors: jsonb("colors")
      .$type<(typeof COLORS)[number][]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    isVisible: boolean("is_visible").notNull().default(false),
    /** Non-null = featured on the homepage; lower ranks first (AS-18). */
    featuredRank: integer("featured_rank"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("products_code_key").on(t.code),
    uniqueIndex("products_slug_key").on(t.slug),
    index("products_category_idx").on(t.categoryId),
    index("products_visible_created_idx").on(t.isVisible, t.createdAt.desc()),
    index("products_featured_idx")
      .on(t.featuredRank)
      .where(sql`${t.featuredRank} is not null`),
    check("products_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("products_price_positive", sql`${t.pricePkr} > 0`),
    check(
      "products_sale_price_valid",
      sql`${t.salePricePkr} is null or (${t.salePricePkr} > 0 and ${t.salePricePkr} < ${t.pricePkr})`,
    ),
    check("products_stock_status_valid", inList("stock_status", STOCK_STATUSES)),
    check("products_badge_valid", sql`badge is null or ${inList("badge", BADGES)}`),
    check(
      "products_colors_valid",
      sql.raw(`jsonb_typeof(colors) = 'array' and colors <@ '${JSON.stringify(COLORS)}'::jsonb`),
    ),
    check("products_name_not_blank", sql`length(trim(${t.name})) > 0`),
    check(
      "products_collab_partner_format",
      sql`${t.collabPartner} is null or ${t.collabPartner} ~ '^[A-Za-z0-9._]{1,30}$'`,
    ),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** 0-based display order; position 0 is the thumbnail (AS-03). */
    position: integer("position").notNull(),
    storageKey: text("storage_key").notNull(),
    widths: jsonb("widths").$type<number[]>().notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    alt: text("alt").notNull().default(""),
    blurDataUrl: text("blur_data_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("product_images_product_idx").on(t.productId, t.position),
    uniqueIndex("product_images_storage_key_key").on(t.storageKey),
    check("product_images_position_range", sql`${t.position} >= 0 and ${t.position} < 6`),
    check("product_images_dimensions_positive", sql`${t.width} > 0 and ${t.height} > 0`),
  ],
);

export const productSizes = pgTable(
  "product_sizes",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    position: integer("position").notNull().default(0),
    isAvailable: boolean("is_available").notNull().default(true),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.label] }),
    check("product_sizes_label_not_blank", sql`length(trim(${t.label})) > 0`),
  ],
);

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerName: text("customer_name").notNull(),
    body: text("body").notNull(),
    rating: smallint("rating"),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    photoKey: text("photo_key"),
    photoWidths: jsonb("photo_widths").$type<number[]>(),
    photoWidth: integer("photo_width"),
    photoHeight: integer("photo_height"),
    photoBlurDataUrl: text("photo_blur_data_url"),
    status: text("status").$type<(typeof REVIEW_STATUSES)[number]>().notNull().default("pending"),
    source: text("source").$type<(typeof REVIEW_SOURCES)[number]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
  },
  (t) => [
    index("reviews_status_created_idx").on(t.status, t.createdAt.desc()),
    check("reviews_status_valid", inList("status", REVIEW_STATUSES)),
    check("reviews_source_valid", inList("source", REVIEW_SOURCES)),
    check("reviews_rating_range", sql`${t.rating} is null or ${t.rating} between 1 and 5`),
    check("reviews_body_length", sql`length(${t.body}) between 1 and 2000`),
    check("reviews_customer_name_length", sql`length(${t.customerName}) between 1 and 80`),
  ],
);

/* ------------------------------------------------------------------ */
/* Orders (manual WhatsApp/DM order log; future checkout extends this) */
/* ------------------------------------------------------------------ */

export const orderCodeSeq = pgSequence("order_code_seq", { startWith: 1 });

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code")
      .notNull()
      .default(sql`'ORD-' || lpad(nextval('order_code_seq')::text, 4, '0')`),
    /** How the order arrived. Future web checkout adds a "web" channel. */
    channel: text("channel").$type<(typeof ORDER_CHANNELS)[number]>().notNull().default("whatsapp"),
    status: text("status").$type<(typeof ORDER_STATUSES)[number]>().notNull().default("received"),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    notes: text("notes").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("orders_code_key").on(t.code),
    index("orders_status_created_idx").on(t.status, t.createdAt.desc()),
    index("orders_created_idx").on(t.createdAt.desc()),
    check("orders_status_valid", inList("status", ORDER_STATUSES)),
    check("orders_channel_valid", inList("channel", ORDER_CHANNELS)),
    check("orders_customer_name_not_blank", sql`length(trim(${t.customerName})) > 0`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** Nullable so deleting a product never destroys order history. */
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    productCode: text("product_code").notNull(),
    size: text("size"),
    quantity: integer("quantity").notNull().default(1),
    unitPricePkr: integer("unit_price_pkr").notNull(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    index("order_items_product_idx").on(t.productId),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
    check("order_items_price_non_negative", sql`${t.unitPricePkr} >= 0`),
  ],
);

export const orderStatusEvents = pgTable(
  "order_status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    note: text("note").notNull().default(""),
    adminId: uuid("admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("order_status_events_order_idx").on(t.orderId, t.createdAt),
    check("order_status_events_to_valid", inList("to_status", ORDER_STATUSES)),
  ],
);

/* ------------------------------------------------------------------ */
/* Site settings (single row)                                          */
/* ------------------------------------------------------------------ */

export interface FaqItem {
  question: string;
  answer: string;
}

/** Optional per-locale overrides of owner-entered text (CS-15). Empty = use the default (English). */
export interface LocalizedSettingsText {
  announcementText?: string;
  heroEyebrow?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroCtaLabel?: string;
  collabTitle?: string;
  collabBody?: string;
  deliverySummary?: string;
  deliveryDetails?: string;
  preorderNote?: string;
  aboutBody?: string;
  sizeGuideNote?: string;
  faq?: FaqItem[];
}

export interface SizeChartRow {
  eu: string;
  uk: string;
  us: string;
  footLengthCm: string;
}

export const siteSettings = pgTable(
  "site_settings",
  {
    id: smallint("id").primaryKey().default(1),
    whatsappNumber: text("whatsapp_number").notNull().default(""),
    instagramHandle: text("instagram_handle").notNull().default(""),
    collabInstagramHandle: text("collab_instagram_handle").notNull().default(""),

    announcementEnabled: boolean("announcement_enabled").notNull().default(false),
    announcementText: text("announcement_text").notNull().default(""),
    announcementHref: text("announcement_href").notNull().default(""),

    heroEyebrow: text("hero_eyebrow").notNull().default(""),
    heroTitle: text("hero_title").notNull().default(""),
    heroSubtitle: text("hero_subtitle").notNull().default(""),
    heroCtaLabel: text("hero_cta_label").notNull().default(""),
    heroCtaHref: text("hero_cta_href").notNull().default(""),
    heroImageKey: text("hero_image_key"),
    heroImageWidths: jsonb("hero_image_widths").$type<number[]>(),
    heroImageWidth: integer("hero_image_width"),
    heroImageHeight: integer("hero_image_height"),
    heroImageBlurDataUrl: text("hero_image_blur_data_url"),
    heroImageAlt: text("hero_image_alt").notNull().default(""),

    collabTitle: text("collab_title").notNull().default(""),
    collabBody: text("collab_body").notNull().default(""),

    deliverySummary: text("delivery_summary").notNull().default(""),
    deliveryDetails: text("delivery_details").notNull().default(""),
    preorderNote: text("preorder_note").notNull().default(""),
    aboutBody: text("about_body").notNull().default(""),
    faq: jsonb("faq")
      .$type<FaqItem[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    sizeChart: jsonb("size_chart")
      .$type<SizeChartRow[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    sizeGuideNote: text("size_guide_note").notNull().default(""),
    /** { ur: LocalizedSettingsText } — optional translations of the fields above. */
    localized: jsonb("localized")
      .$type<Partial<Record<"ur", LocalizedSettingsText>>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("site_settings_singleton", sql`${t.id} = 1`),
    check(
      "site_settings_whatsapp_format",
      sql`${t.whatsappNumber} = '' or ${t.whatsappNumber} ~ '^[1-9][0-9]{7,14}$'`,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* Admin auth                                                          */
/* ------------------------------------------------------------------ */

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("admin_users_email_key").on(sql`lower(${t.email})`)],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    /** SHA-256 (hex) of the session token; the raw token only lives in the cookie. */
    id: text("id").primaryKey(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** Absolute expiry: created_at + 24h, never extended (AS-01). */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    userAgent: text("user_agent").notNull().default(""),
  },
  (t) => [
    index("admin_sessions_admin_idx").on(t.adminId),
    index("admin_sessions_expires_idx").on(t.expiresAt),
  ],
);

/** Fixed-window rate limit counters (login, review submission). */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] }), index("rate_limits_window_idx").on(t.windowStart)],
);

/* ------------------------------------------------------------------ */
/* Instagram posts (CS-22): curated by the owner until Meta API access */
/* ------------------------------------------------------------------ */

export const instagramPosts = pgTable(
  "instagram_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postUrl: text("post_url").notNull(),
    storageKey: text("storage_key").notNull(),
    widths: jsonb("widths").$type<number[]>().notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    blurDataUrl: text("blur_data_url"),
    alt: text("alt").notNull().default(""),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("instagram_posts_position_idx").on(t.position),
    uniqueIndex("instagram_posts_storage_key_key").on(t.storageKey),
    check("instagram_posts_url_format", sql`${t.postUrl} ~ '^https://www\.instagram\.com/'`),
  ],
);

/* ------------------------------------------------------------------ */
/* First-party analytics (AS-19): cookie-free, no raw IP or user agent  */
/* ------------------------------------------------------------------ */

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    type: text("type").$type<(typeof ANALYTICS_EVENT_TYPES)[number]>().notNull(),
    /** Cascade, not set null: nulling would collide with the per-day dedupe index (two
     *  views by one visitor of products deleted later would become identical rows). */
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    categorySlug: text("category_slug"),
    /** sha256(dailySalt + ipKey + userAgent + host), 32 hex chars; not linkable across days. */
    visitorDayHash: text("visitor_day_hash").notNull(),
    /** UTC day of the event; with the unique index below, one row per visitor/event/target/day. */
    day: date("day")
      .notNull()
      .default(sql`(now() at time zone 'utc')::date`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("analytics_events_type_created_idx").on(t.type, t.createdAt),
    index("analytics_events_product_created_idx").on(t.productId, t.createdAt),
    check(
      "analytics_events_type_valid",
      sql`${t.type} in (${sql.raw(ANALYTICS_EVENT_TYPES.map((v) => `'${v}'`).join(", "))})`,
    ),
  ],
);
