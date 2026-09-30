import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { env } from "@/server/config/env";
import { bodoni, hanken } from "../fonts";
import "../globals.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(env().SITE_URL),
    title: { default: "Admin", template: "%s | USBA admin" },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { themeColor: "#fbf6f7", width: "device-width", initialScale: 1 };

/** The admin is per-user and always dynamic; instant-navigation validation does not apply. */
export const instant = false;

/** Separate root layout: the admin is English-only and outside the [lang] storefront tree. */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${bodoni.variable} ${hanken.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
