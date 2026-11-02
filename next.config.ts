import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fonts read at runtime by the share-card image route.
  outputFileTracingIncludes: {
    "/api/carte": ["./assets/fonts/**", "./assets/logo-mark.png"],
  },
  // Let browsers keep product images and the logo for a day (and reuse them
  // up to a week while refreshing in the background). New images get new
  // file names, so updates still show up.
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [
      { source: "/merch/:path*", headers: cache },
      { source: "/logo-mark.png", headers: cache },
    ];
  },
};

export default nextConfig;
