import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Added by create-marketing-cms-app: typed links, and the CMS's image host for next/image.
  typedRoutes: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "a.storyblok.com" }] },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
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
