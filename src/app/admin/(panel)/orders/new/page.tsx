import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { listProductOptions } from "@/server/admin/products";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { OrderForm } from "../_components/order-form";

export const metadata: Metadata = { title: "Add manual order" };
export const instant = false;

export default async function NewOrderPage() {
  await requireAdmin();
  const productOptions = await listProductOptions(db());
  return (
    <>
      <PageHeader
        title="Add manual order"
        description="Record an order that came in on WhatsApp, Instagram or in person."
        back={{ href: "/admin/orders", label: "Orders" }}
      />
      <OrderForm products={productOptions} />
    </>
  );
}
