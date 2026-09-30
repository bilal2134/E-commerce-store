import type { Metadata } from "next";
import Link from "next/link";
import { hanken } from "./fonts";
import "./globals.css";

export const metadata: Metadata = { title: "Page not found | USBA Official", robots: { index: false } };

/**
 * Fallback 404 for URLs outside both root layouts (storefront [lang] and
 * /admin). Storefront misses normally render [lang]/not-found instead.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" dir="ltr" className={hanken.variable}>
      <body className="min-h-dvh">
        <main className="container-page flex flex-col items-start py-20">
          <h1 className="text-4xl font-semibold text-cherry">Page not found</h1>
          <p className="mt-4 max-w-md text-ink-soft">This link may be old. Head back to the shop.</p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center rounded-sm bg-cherry px-5 text-sm font-medium text-white"
          >
            Go to USBA Official
          </Link>
        </main>
      </body>
    </html>
  );
}
