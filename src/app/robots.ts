/* src/app/robots.ts
 * robots.txt — allows all crawlers, points to the dynamic sitemap.
 */
import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Admin & auth are not meant for indexing.
      disallow: ["/admin/", "/profil", "/login", "/auth/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
