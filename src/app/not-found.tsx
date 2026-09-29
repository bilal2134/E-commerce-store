import type { Metadata } from "next";
import { NotFoundView } from "@/components/store/not-found-view";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/** Unmatched URLs (outside any route group) still get the store chrome. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <NotFoundView />
      </main>
      <SiteFooter />
    </>
  );
}
