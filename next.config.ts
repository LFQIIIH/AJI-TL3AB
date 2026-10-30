import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fonts read at runtime by the share-card image route.
  outputFileTracingIncludes: {
    "/api/carte": ["./assets/fonts/**"],
  },
};

export default nextConfig;
