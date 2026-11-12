import type { MetadataRoute } from "next";
import { IS_PRODUCTION_SITE, SITE_URL } from "@/lib/config";

// Production: everything public is crawlable; API routes, the auth callback and
// the staff area (/admin) are not. Private pages (/compte, /connexion, /r/…) are NOT blocked on purpose:
// they carry a noindex tag, which Google can only see if it may crawl them.
// Preview deployments: nothing may be crawled.
export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION_SITE) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/admin/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
