/**
 * Seeds DEVELOPMENT/TEST sample data (see scripts/seed-data.ts header).
 *
 *   pnpm db:seed            reset catalogue/content tables and reseed
 *
 * Refuses to run when NODE_ENV=production unless SEED_ALLOW_PRODUCTION=1.
 * Product photos are generated abstract placeholders labelled "Sample photo".
 */
import { sql } from "drizzle-orm";
import sharp from "sharp";
import { COLOR_SWATCHES, FOOTWEAR_SIZES, type Color } from "../src/domain/catalog";
import { processAndStoreImage } from "../src/server/images/pipeline";
import * as s from "../src/server/db/schema";
import { SEED_CATEGORIES, SEED_PRODUCTS, SEED_SIZE_CHART } from "./seed-data";
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

/** Pastel tint of a swatch colour for placeholder backgrounds. */
function tint(hex: string, amount: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#f2c9d4";
  const n = parseInt(m[1]!, 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function swatch(color: Color | undefined): string {
  const v = color ? COLOR_SWATCHES[color] : "#eda3bd";
  return v.startsWith("#") ? v : "#eda3bd";
}

/** Abstract 4:5 placeholder: an arched "window" in the product's colour. */
async function placeholderImage(colors: Color[], variant: number): Promise<Buffer> {
  const main = swatch(colors[0]);
  const second = swatch(colors[1] ?? colors[0]);
  const bg = tint(main, 0.86);
  const arch = tint(main, variant === 0 ? 0.35 : 0.55);
  const accent = tint(second, 0.15);
  const W = 1200;
  const H = 1500;
  const shapes =
    variant === 0
      ? `<path d="M300 1260 V620 a300 300 0 0 1 600 0 V1260 Z" fill="${arch}"/>
         <ellipse cx="600" cy="1265" rx="360" ry="34" fill="${tint(main, 0.7)}"/>
         <circle cx="600" cy="880" r="120" fill="${accent}"/>`
      : `<rect x="0" y="0" width="${W}" height="${H}" fill="${tint(main, 0.78)}"/>
         <circle cx="760" cy="640" r="330" fill="${arch}"/>
         <path d="M220 1330 V900 a190 190 0 0 1 380 0 V1330 Z" fill="${accent}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${bg}"/>
    ${shapes}
    <text x="${W - 60}" y="${H - 60}" text-anchor="end" font-family="Georgia, serif" font-size="34" fill="${tint(main, 0.2)}" opacity="0.75">Sample photo</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

async function main() {
  const { sql: client, db } = connect();
  const storage = scriptStorage();
  console.log("Seeding development sample data…");

  await db.execute(sql`
    truncate table order_status_events, order_items, orders, reviews, product_sizes,
      product_images, products, categories restart identity cascade
  `);
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
          isAvailable: !(p.soldOutSizes ?? []).includes(label),
        })),
      );
    }

    for (let position = 0; position < 2; position++) {
      const img = await processAndStoreImage(storage, await placeholderImage(p.colors, position), "products");
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
      // Non-routable placeholder (no Pakistani number starts 920…). Replace in Admin → Settings.
      whatsappNumber: process.env.SEED_WHATSAPP_NUMBER ?? "920000000000",
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

  await ensureAdmin(db);
  await client.end();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
