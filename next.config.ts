import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingIncludes: {
    "/api/ocr-sheet/documents/[key]/decision": [
      "./node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf",
    ],
  },
  cacheComponents: false,
  partialPrefetching: false,
  experimental: {
    // Database-backed pages — skip static prerender at build time
    ppr: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
