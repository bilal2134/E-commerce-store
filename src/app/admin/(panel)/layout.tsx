import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * Chrome for every signed-in admin page. It reads no session data, so it
 * prerenders as a static shell; each page validates the session itself with
 * requireAdmin() behind loading.tsx.
 */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
