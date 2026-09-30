"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Fires one `category_view` per category page visit. Renders nothing. */
export function CategoryViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    track("category_view", { slug });
  }, [slug]);
  return null;
}
