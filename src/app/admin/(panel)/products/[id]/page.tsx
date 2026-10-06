import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { FOOTWEAR_SIZES } from "@/domain/catalog";
import { DEFAULT_COLLAB_HANDLE } from "@/domain/validation/product";
import { getProductForEdit, listCategoryGroups } from "@/server/admin/products";
import { getSettingsRow } from "@/server/admin/settings";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { thumbUrl } from "../../../_lib/media";
import { ProductForm } from "../_components/product-form";

export const metadata: Metadata = { title: "Edit product" };
export const instant = false;

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { saved } = await searchParams;
  const [product, groups, settings] = await Promise.all([
    getProductForEdit(db(), id),
    listCategoryGroups(db()),
    getSettingsRow(db()),
  ]);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.name}
        description={`${product.code} · changes save to the live site as soon as you press Save product.`}
        back={{ href: "/admin/products", label: "Products" }}
      />
      <ProductForm
        mode="edit"
        productId={product.id}
        code={product.code}
        categoryGroups={groups}
        defaultCollabHandle={settings.collabInstagramHandle || DEFAULT_COLLAB_HANDLE}
        notice={saved === "created" ? "Product created and saved" : undefined}
        initial={{
          name: product.name,
          slug: product.slug,
          description: product.description,
          categoryId: product.categoryId,
          price: String(product.pricePkr),
          salePrice: product.salePricePkr === null ? "" : String(product.salePricePkr),
          stockStatus: product.stockStatus,
          badge: product.badge ?? "",
          collab: product.collabPartner !== null,
          collabPartner: product.collabPartner ?? "",
          colors: product.colors,
          isVisible: product.isVisible,
          featured: product.featuredRank !== null,
          sizes: product.sizes
            .filter((s): s is typeof s & { label: (typeof FOOTWEAR_SIZES)[number] } =>
              (FOOTWEAR_SIZES as readonly string[]).includes(s.label),
            )
            .map((s) => ({
              label: s.label,
              isAvailable: s.isAvailable,
              quantity: s.stockQuantity === null ? "" : String(s.stockQuantity),
              base: s.stockQuantity,
            })),
          trackStock: product.stockQuantity !== null,
          quantity: product.stockQuantity === null ? "" : String(product.stockQuantity),
          quantityBase: product.stockQuantity,
        }}
        initialImages={product.images.map((img) => ({
          ...img,
          previewUrl: thumbUrl(img) ?? "",
        }))}
      />
    </>
  );
}
