import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import { env } from "@/server/config/env";
import "./globals.css";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-bodoni",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(env().SITE_URL),
    title: { default: "USBA Official — Heels, Bags & Accessories", template: "%s | USBA Official" },
    description:
      "Shop USBA Official: heels, sneakers, flats, bags, wallets, jewellery, phone cases and clothing. Order on WhatsApp or Instagram.",
    applicationName: "USBA Official",
    openGraph: { siteName: "USBA Official", type: "website", locale: "en_PK" },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#fbf6f7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // `dir` is explicit so a future Urdu (RTL) locale only changes this value;
  // layouts use logical properties (ms/me, ps/pe, start/end) throughout.
  return (
    <html lang="en" dir="ltr" className={`${bodoni.variable} ${hanken.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
