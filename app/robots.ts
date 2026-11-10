import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Private pages (/compte, /connexion, /r/…) are NOT blocked here on purpose:
// they carry a noindex tag, which Google can only see if it may crawl them.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] }],
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
    host: SITE_URL,
  };
}
