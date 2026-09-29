import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { listFeatured, listNotFeatured } from "@/server/admin/products";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { thumbUrl } from "../../../_lib/media";
import { FeaturedManager } from "../_components/featured-manager";

export const metadata: Metadata = { title: "Homepage order" };
export const instant = false;

export default async function FeaturedPage() {
  await requireAdmin();
  const [featured, others] = await Promise.all([listFeatured(db()), listNotFeatured(db())]);
  return (
    <>
      <PageHeader
        title="Homepage order"
        description="Featured products appear on the homepage in this order, first to last. Drag to reorder, or use the arrow buttons."
        back={{ href: "/admin/products", label: "Products" }}
      />
      <FeaturedManager
        items={featured.map((f) => ({
          id: f.id,
          name: f.name,
          code: f.code,
          isVisible: f.isVisible,
          soldOut: f.stockStatus === "out_of_stock",
          thumbUrl: thumbUrl(f.thumb),
        }))}
        candidates={others}
      />
    </>
  );
}
