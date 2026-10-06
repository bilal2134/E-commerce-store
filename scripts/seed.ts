/**
 * Seeds DEVELOPMENT/TEST sample data (see scripts/seed-data.ts header).
 *
 *   pnpm db:seed            reset catalogue/content tables and reseed
 *
 * Refuses to run when NODE_ENV=production unless SEED_ALLOW_PRODUCTION=1.
 * Product photos are generated category illustrations labelled "Sample photo".
 * SEED_PLACEHOLDERS=0 skips the extra placeholder content (used by E2E).
 */
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { COLOR_SWATCHES, FOOTWEAR_SIZES, type Color } from "../src/domain/catalog";
import { processAndStoreImage } from "../src/server/images/pipeline";
import * as s from "../src/server/db/schema";
import {
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_SIZE_CHART,
  SEED_STOCK,
  SEED_STOCK_PER_SIZE,
  type SeedProduct,
} from "./seed-data";
import { CATEGORY_ILLUSTRATION, illustrationSvg, type IllustrationKind } from "./lib/illustrations";
import { connect, scriptStorage } from "./lib/script-db";
import { ensureAdmin } from "./lib/admin";

if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "1") {
  console.error("Refusing to seed sample data with NODE_ENV=production.");
  process.exit(1);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function swatch(color: Color | undefined): string {
  const v = color ? COLOR_SWATCHES[color] : "#eda3bd";
  return v.startsWith("#") ? v : "#eda3bd";
}

/** Category illustration in the product's colours (4:5, labelled "Sample photo"). */
async function placeholderImage(colors: Color[], categorySlug: string, variant: number): Promise<Buffer> {
  const kind = CATEGORY_ILLUSTRATION[categorySlug] ?? "clutch";
  const main = swatch(colors[0]);
  const accent = colors[1] ? swatch(colors[1]) : "#a8123a";
  return sharp(Buffer.from(illustrationSvg(kind, main, accent, variant)))
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** Square crop of an illustration, used for sample Instagram posts. */
async function squareImage(colors: Color[], categorySlug: string): Promise<Buffer> {
  const img = await placeholderImage(colors, categorySlug, 1);
  return sharp(img).resize(1200, 1200, { fit: "cover", position: "centre" }).jpeg({ quality: 88 }).toBuffer();
}

/** Editorial sample banner for the homepage hero (4:5), clearly labelled. */
async function bannerImage(): Promise<Buffer> {
  const W = 1200;
  const H = 1500;
  const parts: [string, string, string, number, number, number][] = [
    ["heel", "#a8123a", "#f2c9d4", 80, 150, 0.62],
    ["shoulder-bag", "#2a1520", "#a8123a", 470, 520, 0.72],
    ["phone-case", "#f2c9d4", "#a8123a", 120, 760, 0.6],
  ];
  const groups = parts
    .map(([kind, main, accent, x, y, scale]) => {
      const svg = illustrationSvg(kind as IllustrationKind, main, accent, 0);
      const inner = svg.slice(svg.indexOf("<g "), svg.lastIndexOf("</g>") + 4);
      return `<g transform="translate(${x} ${y}) scale(${scale})">${inner}</g>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#f8e4ea"/>
    <circle cx="880" cy="330" r="260" fill="#f2c9d4"/>
    <circle cx="260" cy="1180" r="200" fill="#fbf6f7"/>
    ${groups}
    <text x="${W - 56}" y="${H - 56}" text-anchor="end" font-family="Georgia, serif" font-size="34" fill="#5c4652">Sample banner</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

/** Rich placeholder content (banner, Instagram, extra reviews/orders). Off for E2E. */
const PLACEHOLDERS = process.env.SEED_PLACEHOLDERS !== "0";

async function main() {
  const { sql: client, db } = connect();
  const storage = scriptStorage();
  console.log("Seeding development sample data…");

  // DELETE rather than TRUNCATE so this also runs on Aurora DSQL (ADR 0014).
  // Children first; sub-categories before their parents (RESTRICT foreign key).
  for (const statement of [
    sql`delete from order_status_events`,
    sql`delete from order_items`,
    sql`delete from orders`,
    sql`delete from reviews`,
    sql`delete from product_sizes`,
    sql`delete from product_images`,
    sql`delete from products`,
    sql`delete from categories where parent_id is not null`,
    sql`delete from categories`,
    sql`delete from instagram_posts`,
  ]) {
    await db.execute(statement);
  }
  await db.execute(sql`alter sequence product_code_seq restart with 1`);
  await db.execute(sql`alter sequence order_code_seq restart with 1`);

  // Categories
  const categoryIds = new Map<string, { id: string; root: string }>();
  for (const [i, root] of SEED_CATEGORIES.entries()) {
    const [r] = await db
      .insert(s.categories)
      .values({ slug: root.slug, name: root.name, description: root.description, position: i })
      .returning({ id: s.categories.id });
    categoryIds.set(root.slug, { id: r!.id, root: root.slug });
    for (const [j, child] of root.children.entries()) {
      const [c] = await db
        .insert(s.categories)
        .values({ ...child, parentId: r!.id, position: j })
        .returning({ id: s.categories.id });
      categoryIds.set(child.slug, { id: c!.id, root: root.slug });
    }
  }

  // Products (oldest first so codes follow creation order)
  const ordered = [...SEED_PRODUCTS].sort((a, b) => b.ageDays - a.ageDays);
  const productIds = new Map<string, string>();
  for (const p of ordered) {
    const cat = categoryIds.get(p.category);
    if (!cat) throw new Error(`Unknown category ${p.category}`);
    const createdAt = new Date(Date.now() - p.ageDays * 86_400_000);
    const [row] = await db
      .insert(s.products)
      .values({
        slug: slugify(p.name),
        name: p.name,
        description:
          p.description ??
          `${p.name} from USBA. Sample description for development — replace with real product details in the admin panel.`,
        categoryId: cat.id,
        pricePkr: p.price,
        salePricePkr: p.sale ?? null,
        stockStatus: p.stock ?? "in_stock",
        // Preorders aren't counted; sized products get the sum of their sizes below.
        stockQuantity:
          p.stock === "preorder" ? null : p.stock === "out_of_stock" ? 0 : (p.stockCount ?? SEED_STOCK),
        badge: p.badge ?? null,
        collabPartner: p.collab ? "fairycoreforher" : null,
        colors: p.colors,
        isVisible: !p.hidden,
        featuredRank: p.featured ?? null,
        createdAt,
        updatedAt: createdAt,
      })
      .returning({ id: s.products.id });
    productIds.set(p.name, row!.id);

    if (cat.root === "footwear") {
      await db.insert(s.productSizes).values(
        FOOTWEAR_SIZES.map((label, position) => ({
          productId: row!.id,
          label,
          position,
          isAvailable: sizeCount(p, label) !== 0 && !(p.soldOutSizes ?? []).includes(label),
          stockQuantity: sizeCount(p, label),
        })),
      );
      if (p.stock !== "preorder") {
        await db
          .update(s.products)
          .set({ stockQuantity: FOOTWEAR_SIZES.reduce((sum, label) => sum + (sizeCount(p, label) ?? 0), 0) })
          .where(eq(s.products.id, row!.id));
      }
    }

    for (let position = 0; position < 2; position++) {
      const img = await processAndStoreImage(
        storage,
        await placeholderImage(p.colors, p.category, position),
        "products",
      );
      await db.insert(s.productImages).values({
        productId: row!.id,
        position,
        storageKey: img.storageKey,
        widths: img.widths,
        width: img.width,
        height: img.height,
        blurDataUrl: img.blurDataUrl,
        alt: position === 0 ? `${p.name}` : `${p.name} — alternate view`,
      });
    }
    process.stdout.write(".");
  }
  console.log(`\n${ordered.length} products`);

  // Settings (facts from Requirements only; everything else editable in admin)
  await db
    .update(s.siteSettings)
    .set({
      // Owner's WhatsApp Business number (+92 339 4009791), supplied 2026-10-06. Editable in Admin → Settings.
      whatsappNumber: process.env.SEED_WHATSAPP_NUMBER ?? "923394009791",
      instagramHandle: "usbaofficial",
      collabInstagramHandle: "fairycoreforher",
      announcementEnabled: true,
      announcementText: "Delivery in 18–20 days. Order on WhatsApp or Instagram.",
      announcementHref: "/contact",
      heroEyebrow: "New arrivals",
      heroTitle: "Heels, bags and little extras",
      heroSubtitle: "Browse the latest pieces and order straight from WhatsApp in one tap.",
      heroCtaLabel: "Shop new arrivals",
      heroCtaHref: "/shop?sort=newest",
      heroImageKey: null,
      collabTitle: "USBA × Fairycoreforher",
      collabBody: "Shoes, bags and clothing from our collaboration with @fairycoreforher.",
      deliverySummary: "Delivery in 18–20 days",
      deliveryDetails:
        "Orders are delivered within 18–20 days of confirmation. We confirm every order personally on WhatsApp or Instagram before it's processed.",
      preorderNote:
        "This item is available on preorder. Message us to reserve yours — we'll confirm the expected dispatch date on WhatsApp.",
      aboutBody:
        "USBA Official (@usbaofficial) offers heels, sneakers, flats, bags, wallets, jewellery, phone cases and clothing.\n\nBrowse the collection here and order directly on WhatsApp or Instagram — every order is confirmed personally.",
      faq: [
        {
          question: "How do I order?",
          answer:
            "Open a product, choose your size if it has one, and tap “Order on WhatsApp”. A message with the product name, code, size and link opens in WhatsApp — send it and we'll confirm your order. You can also send us a DM on Instagram.",
        },
        {
          question: "How long does delivery take?",
          answer: "Delivery takes 18–20 days from order confirmation.",
        },
        {
          question: "How do I choose my shoe size?",
          answer:
            "Use the size guide to compare EU, UK and US sizes and foot length. If you're between sizes, message us before ordering.",
        },
        {
          question: "Can I preorder items that aren't in stock yet?",
          answer:
            "Yes. Items marked Preorder can be reserved on WhatsApp; we'll confirm the expected dispatch date.",
        },
      ],
      sizeChart: SEED_SIZE_CHART,
      sizeGuideNote:
        "Measure your foot from heel to longest toe while standing. If you're between two sizes, choose the larger size or message us for advice.",
    })
    .where(sql`id = 1`);

  // Sample reviews — explicitly labelled so they can never pass as real testimonials.
  const sampleReviews = [
    {
      name: "Sample customer A",
      body: "[Sample review] The heels arrived exactly as pictured and fit true to size.",
      product: "Cherry Red Trendy Heels",
      status: "approved" as const,
      rating: 5,
    },
    {
      name: "Sample customer B",
      body: "[Sample review] Loved the packaging and the quick replies on WhatsApp.",
      product: "Golden Shell Clutch",
      status: "approved" as const,
      rating: 5,
    },
    {
      name: "Sample customer C",
      body: "[Sample review] Cute wallet, the colour is even nicer in person.",
      product: "Cherry Kiss Wallet",
      status: "approved" as const,
      rating: 4,
    },
    {
      name: "Sample customer D",
      body: "[Sample review] Ordered sneakers for my sister and she wears them every day.",
      product: "Blue Star Sneakers",
      status: "approved" as const,
      rating: 5,
    },
    {
      name: "Sample customer E",
      body: "[Sample review] Waiting for moderation — submitted from the reviews page.",
      product: null,
      status: "pending" as const,
      rating: 4,
    },
    {
      name: "Sample customer F",
      body: "[Sample review] Another pending submission for testing the approval queue.",
      product: "Diva Heels",
      status: "pending" as const,
      rating: null,
    },
  ];
  for (const r of sampleReviews) {
    await db.insert(s.reviews).values({
      customerName: r.name,
      body: r.body,
      rating: r.rating,
      productId: r.product ? (productIds.get(r.product) ?? null) : null,
      status: r.status,
      source: r.status === "approved" ? "admin" : "customer",
      moderatedAt: r.status === "approved" ? new Date() : null,
    });
  }

  // Sample manual orders
  const sampleOrders = [
    {
      name: "Sample order customer 1",
      phone: "0300 0000001",
      product: "Diva Heels",
      size: "38",
      status: "processing" as const,
    },
    {
      name: "Sample order customer 2",
      phone: "0300 0000002",
      product: "Golden Shell Clutch",
      size: null,
      status: "received" as const,
    },
    {
      name: "Sample order customer 3",
      phone: "0300 0000003",
      product: "Blue Star Sneakers",
      size: "39",
      status: "shipped" as const,
    },
  ];
  for (const o of sampleOrders) {
    const p = SEED_PRODUCTS.find((x) => x.name === o.product)!;
    const [order] = await db
      .insert(s.orders)
      .values({
        customerName: o.name,
        customerPhone: o.phone,
        status: o.status,
        notes: "Sample order (development data)",
      })
      .returning({ id: s.orders.id });
    const [prod] = await db
      .select({ code: s.products.code })
      .from(s.products)
      .where(sql`id = ${productIds.get(o.product)!}`);
    await db.insert(s.orderItems).values({
      orderId: order!.id,
      productId: productIds.get(o.product)!,
      productName: o.product,
      productCode: prod!.code,
      size: o.size,
      quantity: 1,
      unitPricePkr: p.sale ?? p.price,
    });
    const path = ["received", "processing", "shipped"].slice(
      0,
      ["received", "processing", "shipped"].indexOf(o.status) + 1,
    );
    let from: string | null = null;
    for (const st of path) {
      await db.insert(s.orderStatusEvents).values({ orderId: order!.id, fromStatus: from, toStatus: st });
      from = st;
    }
  }

  if (PLACEHOLDERS) await seedPlaceholderContent(db, storage, productIds);

  await ensureAdmin(db);
  await client.end();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

type SeedDb = ReturnType<typeof connect>["db"];
type SeedStorage = ReturnType<typeof scriptStorage>;

/**
 * Placeholder content so the demo store looks complete. Everything is labelled
 * as sample text/imagery; the owner replaces it in the admin.
 */
async function seedPlaceholderContent(db: SeedDb, storage: SeedStorage, productIds: Map<string, string>) {
  const byName = (name: string) => SEED_PRODUCTS.find((p) => p.name === name)!;

  // Hero banner
  const banner = await processAndStoreImage(storage, await bannerImage(), "banners");
  await db
    .update(s.siteSettings)
    .set({
      heroImageKey: banner.storageKey,
      heroImageWidths: banner.widths,
      heroImageWidth: banner.width,
      heroImageHeight: banner.height,
      heroImageBlurDataUrl: banner.blurDataUrl,
      heroImageAlt: "Sample banner: cherry heels, a shoulder bag and a phone case",
      aboutBody: [
        "USBA Official (@usbaofficial) offers heels, sneakers, flats, bags, wallets, jewellery, phone cases and clothing.",
        "Sample brand story: every piece is chosen for a playful, feminine wardrobe — cherry-red heels, butterfly bags, charms and soft coquette sets — and our collaboration with @fairycoreforher brings its own fairycore favourites.",
        "Browse the collection here and order directly on WhatsApp or Instagram. Every order is confirmed personally before it's processed.",
        "(Sample text — replace in Admin → Settings → About.)",
      ].join("\n\n"),
    })
    .where(sql`id = 1`);
  const [settings] = await db
    .select({ faq: s.siteSettings.faq })
    .from(s.siteSettings)
    .where(sql`id = 1`);
  await db
    .update(s.siteSettings)
    .set({
      faq: [
        ...(settings?.faq ?? []),
        {
          question: "How do I pay?",
          answer:
            "Sample answer — replace in Admin → Settings: we share payment details on WhatsApp when we confirm your order.",
        },
      ],
    })
    .where(sql`id = 1`);

  // Urdu versions of the owner text for /ur (sample translations; review before launch)
  await db
    .update(s.siteSettings)
    .set({
      localized: {
        ur: {
          announcementText: "ڈیلیوری 18 سے 20 دن میں۔ واٹس ایپ یا انسٹاگرام پر آرڈر کریں۔",
          heroEyebrow: "نئی آمد",
          heroTitle: "ہیلز، بیگز اور بہت کچھ",
          heroSubtitle: "تازہ ترین اشیاء دیکھیں اور ایک ٹیپ میں واٹس ایپ پر آرڈر کریں۔",
          heroCtaLabel: "نئی آمد دیکھیں",
          collabBody: "\u2066@fairycoreforher\u2069 کے ساتھ ہماری کولیبوریشن کے جوتے، بیگز اور کپڑے۔",
          deliverySummary: "ڈیلیوری 18 سے 20 دن میں",
          deliveryDetails:
            "آرڈر کی تصدیق کے بعد 18 سے 20 دن میں ڈیلیوری ہوتی ہے۔ ہر آرڈر کی تصدیق واٹس ایپ یا انسٹاگرام پر ذاتی طور پر کی جاتی ہے۔",
          preorderNote:
            "یہ چیز پری آرڈر پر دستیاب ہے۔ اپنی چیز محفوظ کرنے کے لیے پیغام بھیجیں، ہم واٹس ایپ پر متوقع ترسیل کی تاریخ بتائیں گے۔",
          aboutBody: [
            "USBA Official (\u2066@usbaofficial\u2069) ہیلز، سنیکرز، فلیٹس، بیگز، والٹس، جیولری، فون کورز اور کپڑے پیش کرتا ہے۔",
            "یہاں کلیکشن دیکھیں اور واٹس ایپ یا انسٹاگرام پر براہ راست آرڈر کریں۔ ہر آرڈر کی تصدیق ذاتی طور پر کی جاتی ہے۔",
            "(نمونہ متن — ایڈمن → سیٹنگز میں تبدیل کریں۔)",
          ].join("\n\n"),
          faq: [
            {
              question: "میں آرڈر کیسے کروں؟",
              answer:
                "پروڈکٹ کھولیں، سائز ہو تو منتخب کریں اور “واٹس ایپ پر آرڈر کریں” دبائیں۔ پروڈکٹ کے نام، کوڈ، سائز اور لنک کے ساتھ پیغام واٹس ایپ میں کھل جائے گا — اسے بھیج دیں، ہم آرڈر کی تصدیق کریں گے۔ آپ انسٹاگرام پر ڈی ایم بھی کر سکتے ہیں۔",
            },
            { question: "ڈیلیوری میں کتنا وقت لگتا ہے؟", answer: "آرڈر کی تصدیق سے 18 سے 20 دن۔" },
            {
              question: "میں جوتوں کا سائز کیسے چنوں؟",
              answer:
                "سائز گائیڈ میں EU، UK اور US سائز اور پاؤں کی لمبائی دیکھیں۔ دو سائز کے درمیان ہوں تو آرڈر سے پہلے پیغام بھیجیں۔",
            },
            {
              question: "کیا میں اسٹاک میں نہ ہونے والی چیز پری آرڈر کر سکتی ہوں؟",
              answer:
                "جی ہاں۔ پری آرڈر والی اشیاء واٹس ایپ پر محفوظ کی جا سکتی ہیں؛ ہم متوقع ترسیل کی تاریخ بتائیں گے۔",
            },
            {
              question: "ادائیگی کیسے کروں؟",
              answer:
                "نمونہ جواب — ایڈمن → سیٹنگز میں تبدیل کریں: آرڈر کی تصدیق کے وقت ادائیگی کی تفصیل واٹس ایپ پر بتائی جاتی ہے۔",
            },
          ],
        },
      },
    })
    .where(sql`id = 1`);

  // Instagram posts (sample images linking to the profile)
  const igProducts = [
    "Cherry Red Trendy Heels",
    "Golden Shell Clutch",
    "Jellyfish Top",
    "Pink Bow Sneakers",
    "Cherry Phone Case Set",
    "Coquette Set",
  ];
  for (const [position, name] of igProducts.entries()) {
    const p = byName(name);
    const img = await processAndStoreImage(storage, await squareImage(p.colors, p.category), "instagram");
    await db.insert(s.instagramPosts).values({
      postUrl: "https://www.instagram.com/usbaofficial/",
      storageKey: img.storageKey,
      widths: img.widths,
      width: img.width,
      height: img.height,
      blurDataUrl: img.blurDataUrl,
      alt: `Sample Instagram post: ${name}`,
      position,
    });
  }

  // More sample reviews, some with photos
  const moreReviews = [
    {
      name: "Sample customer G",
      product: "Leopard Heels",
      rating: 5,
      photo: true,
      body: "[Sample review] The collab heels are even prettier in person. Wore them to a wedding.",
    },
    {
      name: "Sample customer H",
      product: "Butterfly Rhinestone Bag",
      rating: 5,
      photo: true,
      body: "[Sample review] Sparkly and the perfect size for an evening out.",
    },
    {
      name: "Sample customer I",
      product: "Powerpuff Phone Case",
      rating: 4,
      photo: false,
      body: "[Sample review] Fits well and the print is so cute.",
    },
    {
      name: "Sample customer J",
      product: "Coquette Set",
      rating: 5,
      photo: true,
      body: "[Sample review] Soft fabric, ordered my usual size and it fit.",
    },
    {
      name: "Sample customer K",
      product: "Mary Jane Flats",
      rating: 4,
      photo: false,
      body: "[Sample review] Comfortable for daily wear; ask for sizing help if you're unsure.",
    },
    {
      name: "Sample customer L",
      product: null,
      rating: null,
      photo: false,
      body: "[Sample review] Quick replies on WhatsApp and the order was confirmed the same day.",
    },
  ];
  for (const [i, r] of moreReviews.entries()) {
    const p = r.product ? byName(r.product) : null;
    const photo =
      r.photo && p
        ? await processAndStoreImage(storage, await placeholderImage(p.colors, p.category, 1), "reviews")
        : null;
    await db.insert(s.reviews).values({
      customerName: r.name,
      body: r.body,
      rating: r.rating,
      productId: r.product ? (productIds.get(r.product) ?? null) : null,
      photoKey: photo?.storageKey ?? null,
      photoWidths: photo?.widths ?? null,
      photoWidth: photo?.width ?? null,
      photoHeight: photo?.height ?? null,
      photoBlurDataUrl: photo?.blurDataUrl ?? null,
      status: "approved",
      source: "admin",
      createdAt: new Date(Date.now() - (i + 1) * 3 * 86_400_000),
      moderatedAt: new Date(),
    });
  }

  // More sample orders across statuses and dates
  const statuses = [
    "received",
    "processing",
    "shipped",
    "delivered",
    "delivered",
    "cancelled",
    "delivered",
    "shipped",
  ] as const;
  const flow = ["received", "processing", "shipped", "delivered"];
  const orderProducts = [
    "Silver Butterfly Heels",
    "Cherry Kiss Wallet",
    "Pink Fur Jacket",
    "Gold Serpentine Watch",
    "Pink Bow Sneakers",
    "Red Structured Bag",
    "Pearl Drop Necklace",
    "Coquette Set",
  ];
  for (const [i, name] of orderProducts.entries()) {
    const p = byName(name);
    const status = statuses[i]!;
    const createdAt = new Date(Date.now() - (i + 2) * 2 * 86_400_000);
    const [order] = await db
      .insert(s.orders)
      .values({
        customerName: `Sample order customer ${i + 4}`,
        customerPhone: `0300 00000${String(i + 10).padStart(2, "0")}`,
        channel: i % 3 === 0 ? "instagram" : "whatsapp",
        status,
        notes: "Sample order (development data)",
        createdAt,
        updatedAt: createdAt,
      })
      .returning({ id: s.orders.id });
    const [prod] = await db
      .select({ code: s.products.code })
      .from(s.products)
      .where(sql`id = ${productIds.get(name)!}`);
    await db.insert(s.orderItems).values({
      orderId: order!.id,
      productId: productIds.get(name)!,
      productName: name,
      productCode: prod!.code,
      size: p.category === "heels" || p.category === "sneakers" || p.category === "flats" ? "38" : null,
      quantity: 1,
      unitPricePkr: p.sale ?? p.price,
    });
    const path = status === "cancelled" ? ["received", "cancelled"] : flow.slice(0, flow.indexOf(status) + 1);
    let from: string | null = null;
    for (const st of path) {
      await db
        .insert(s.orderStatusEvents)
        .values({ orderId: order!.id, fromStatus: from, toStatus: st, createdAt });
      from = st;
    }
  }
  console.log(
    "Placeholder content: banner, 6 Instagram posts, 6 reviews, 8 orders, payment FAQ, brand story.",
  );
}

/** Sample pairs in one size: none when sold out, not counted for preorders. */
function sizeCount(p: SeedProduct, label: string): number | null {
  if (p.stock === "preorder") return null;
  if (p.stock === "out_of_stock" || (p.soldOutSizes ?? []).includes(label)) return 0;
  return p.stockCounts?.[label] ?? SEED_STOCK_PER_SIZE;
}
