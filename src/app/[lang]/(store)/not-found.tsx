import type { Metadata } from "next";
import { NotFoundView } from "@/components/store/not-found-view";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.meta.notFoundTitle, robots: { index: false } };
}

export default function StoreNotFound() {
  return <NotFoundView />;
}
