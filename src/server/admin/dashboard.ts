import "server-only";
import { eq, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { products, reviews } from "../db/schema";
import { recentOrders, type OrderListRow } from "./orders";
import { getSettingsRow, PLACEHOLDER_WHATSAPP } from "./settings";

export interface ChecklistItem {
  id: string;
  label: string;
  detail: string;
  href: string;
  done: boolean;
}

export interface DashboardData {
  totals: { products: number; visible: number; outOfStock: number; preorder: number };
  pendingReviews: number;
  recentOrders: OrderListRow[];
  checklist: ChecklistItem[];
}

export async function getDashboard(database: Database): Promise<DashboardData> {
  const [totals, pending, orders, settings] = await Promise.all([
    database
      .select({
        products: sql<number>`count(*)::int`,
        visible: sql<number>`(count(*) filter (where ${products.isVisible}))::int`,
        outOfStock: sql<number>`(count(*) filter (where ${products.stockStatus} = 'out_of_stock'))::int`,
        preorder: sql<number>`(count(*) filter (where ${products.stockStatus} = 'preorder'))::int`,
      })
      .from(products),
    database
      .select({ count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(eq(reviews.status, "pending")),
    recentOrders(database, 5),
    getSettingsRow(database),
  ]);

  const hasPaymentFaq = settings.faq.some((f) =>
    /\b(pay|payment|payments|paying|cash|cod|jazzcash|easypaisa|bank)\b/i.test(f.question),
  );
  const whatsappOk = settings.whatsappNumber !== "" && settings.whatsappNumber !== PLACEHOLDER_WHATSAPP;

  return {
    totals: totals[0] ?? { products: 0, visible: 0, outOfStock: 0, preorder: 0 },
    pendingReviews: pending[0]?.count ?? 0,
    recentOrders: orders,
    checklist: [
      {
        id: "whatsapp",
        label: "Set your WhatsApp number",
        detail: whatsappOk
          ? "Customers can order on WhatsApp."
          : "The number is empty or still the placeholder, so order buttons will not reach you.",
        href: "/admin/settings#whatsapp",
        done: whatsappOk,
      },
      {
        id: "hero",
        label: "Add a homepage banner image",
        detail: settings.heroImageKey
          ? "Your homepage banner has an image."
          : "The homepage banner has no image yet.",
        href: "/admin/settings#hero",
        done: Boolean(settings.heroImageKey),
      },
      {
        id: "payment-faq",
        label: "Answer the payment question in the FAQ",
        detail: hasPaymentFaq
          ? "The FAQ explains how payment works."
          : "Customers usually ask how to pay. Add a question about payment to the FAQ.",
        href: "/admin/settings#faq",
        done: hasPaymentFaq,
      },
    ],
  };
}
