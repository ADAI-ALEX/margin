import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Browsers still request /favicon.ico; serve the SVG app icon.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
  partialPrefetching: true,
  experimental: {
    // A restored Turbopack build cache on Vercel shipped a stale globals.css (old tokens beside new
    // components). The app builds in about a minute without it; scripts/check-build-css.mjs guards the output.
    turbopackFileSystemCacheForBuild: false,
  },
  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
