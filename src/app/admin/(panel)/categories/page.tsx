import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { listCategoryTree } from "@/server/admin/categories";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { CategoriesManager } from "./_components/categories-manager";

export const metadata: Metadata = { title: "Categories" };
export const instant = false;

export default async function CategoriesPage() {
  await requireAdmin();
  const tree = await listCategoryTree(db());
  return (
    <>
      <PageHeader
        title="Categories"
        description="Rename categories, edit the descriptions shown on category pages and in search results, change their order, or add sub-categories. Links (e.g. /shop/heels) never change once created."
      />
      <CategoriesManager tree={tree} />
    </>
  );
}
