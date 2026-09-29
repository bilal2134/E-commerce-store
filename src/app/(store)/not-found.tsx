import type { Metadata } from "next";
import { NotFoundView } from "@/components/store/not-found-view";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function StoreNotFound() {
  return <NotFoundView />;
}
