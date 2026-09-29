import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | USBA admin" },
  robots: { index: false, follow: false },
};

/** The admin is per-user and always dynamic; instant-navigation validation does not apply. */
export const instant = false;

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}
