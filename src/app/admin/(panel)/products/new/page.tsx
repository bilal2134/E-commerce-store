import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { DEFAULT_COLLAB_HANDLE } from "@/domain/validation/product";
import { listCategoryGroups } from "@/server/admin/products";
import { getSettingsRow } from "@/server/admin/settings";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { ProductForm } from "../_components/product-form";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireAdmin();
  const [groups, settings] = await Promise.all([listCategoryGroups(db()), getSettingsRow(db())]);
  return (
    <>
      <PageHeader
        title="Add product"
        description="Fill in the details, add at least two photos and choose whether it is visible on the site."
        back={{ href: "/admin/products", label: "Products" }}
      />
      <ProductForm
        mode="create"
        categoryGroups={groups}
        defaultCollabHandle={settings.collabInstagramHandle || DEFAULT_COLLAB_HANDLE}
        initial={{
          name: "",
          slug: "",
          description: "",
          categoryId: "",
          price: "",
          salePrice: "",
          stockStatus: "in_stock",
          badge: "",
          collab: false,
          collabPartner: "",
          colors: [],
          isVisible: false,
          featured: false,
          sizes: [],
        }}
        initialImages={[]}
      />
    </>
  );
}
