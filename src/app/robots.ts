import type { MetadataRoute } from "next";
import { env } from "@/server/config/env";

export default function robots(): MetadataRoute.Robots {
  const site = env().SITE_URL;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Admin, APIs and internal search results are not for indexing.
        // Filter/sort parameters produce the same listing as the canonical URL.
        disallow: [
          "/admin",
          "/api/",
          "/search",
          "/*?*sort=",
          "/*?*color=",
          "/*?*min=",
          "/*?*max=",
          "/*?*stock=",
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
