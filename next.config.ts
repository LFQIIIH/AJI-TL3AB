import type { NextConfig } from "next";
import { SITE_HOST, SITE_URL } from "./lib/config";

const nextConfig: NextConfig = {
  images: {
    // Product photos and the logo: AVIF first, WebP fallback, resized per screen.
    formats: ["image/avif", "image/webp"],
    // Optimised images are cached for 31 days (fewer re-optimisations on Vercel).
    minimumCacheTTL: 2678400,
    // Homepage photos uploaded in /admin/photos (public Supabase bucket).
    remotePatterns: supabaseImages(),
  },
  // Fonts read at runtime by the share-card image route.
  // Fonts and logo read at runtime by the share-card route and the share images
  // (/jouer/og.png is re-rendered every 5 min on the server, so it needs them there).
  outputFileTracingIncludes: {
    "/api/carte": ["./assets/fonts/**", "./assets/logo-mark.png"],
    "/og.png": ["./assets/fonts/**", "./assets/logo-mark.png"],
    "/*/og.png": ["./assets/fonts/**", "./assets/logo-mark.png", "./public/merch/**"],
  },
  // Let browsers keep product images and the logo for a day (and reuse them
  // up to a week while refreshing in the background). New images get new
  // file names, so updates still show up.
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [
      { source: "/merch/:path*", headers: cache },
      { source: "/logo-mark.png", headers: cache },
      // Browsers only ever use HTTPS for the site (2 years). No includeSubDomains:
      // other subdomains (e.g. for email) aren't ours to force onto HTTPS.
      { source: "/:path*", headers: [{ key: "Strict-Transport-Security", value: "max-age=63072000" }] },
      // Only the production host may be indexed: preview deployments and
      // *.vercel.app addresses send "noindex".
      {
        source: "/:path*",
        missing: [{ type: "host", value: SITE_HOST }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  // One host: ajitl3ab.com → www.ajitl3ab.com in a single 301, path and query kept.
  // (If the Vercel domain settings already redirect the apex, that runs first.)
  async redirects() {
    return [
      // The shop lives at /merch; "/boutique" is the natural French word, so send it there.
      { source: "/boutique", destination: `${SITE_URL}/merch`, statusCode: 301 },
      {
        source: "/:path*",
        has: [{ type: "host", value: SITE_HOST.replace(/^www\./, "") }],
        destination: `${SITE_URL}/:path*`,
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;

/** Supabase public photo folder, from NEXT_PUBLIC_SUPABASE_URL (none if unset). */
function supabaseImages() {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return [
      {
        protocol: u.protocol.replace(":", "") as "http" | "https",
        hostname: u.hostname,
        port: u.port,
        pathname: "/storage/v1/object/public/site-photos/**",
      },
    ];
  } catch {
    return [];
  }
}
