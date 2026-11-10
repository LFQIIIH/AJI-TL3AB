import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Built once at build time from the real routes in app/: every page.tsx is
// listed, except
// - pages marked noindex (`robots: { index: false }`: account, login, referral, 404),
// - API / auth routes (route.ts, not pages) and private folders (_x),
// - dynamic routes ([param]) — the only one today is /r/[code] (referral
//   links, noindex). A future indexable dynamic route must list its URLs here.
// No <lastmod>: the pages have no reliable "last changed" date (match and
// session lists come from a Google Sheet), and a fake one is worse than none.
export const dynamic = "force-static";

const APP_DIR = path.join(process.cwd(), "app");
const PAGE_FILES = ["page.tsx", "page.ts", "page.jsx", "page.js", "page.mdx"];
const NOINDEX = /robots:\s*\{[^}]*index:\s*false/;

function findRoutes(dir: string, segments: string[]): string[] {
  const routes: string[] = [];
  const page = PAGE_FILES.map((f) => path.join(dir, f)).find((f) => existsSync(f));
  if (page && !NOINDEX.test(readFileSync(page, "utf8"))) {
    routes.push("/" + segments.join("/"));
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const name = entry.name;
    if (!entry.isDirectory() || name.startsWith("_") || name.startsWith("[") || name.startsWith("@") || name === "api") continue;
    // Route groups "(name)" don't add a URL segment.
    const next = name.startsWith("(") && name.endsWith(")") ? segments : [...segments, name];
    routes.push(...findRoutes(path.join(dir, name), next));
  }
  return routes;
}

/** Same form as the canonical tags: no trailing slash, home is the bare domain. */
const absolute = (route: string) => (route === "/" ? SITE_URL : `${SITE_URL}${route}`);

export default function sitemap(): MetadataRoute.Sitemap {
  return findRoutes(APP_DIR, [])
    .sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)))
    .map((route) => ({ url: absolute(route) }));
}
