import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Cache Components: static shells are prerendered, data is cached with
  // `'use cache'` in lib/cms.ts and invalidated by tag from /api/revalidate.
  cacheComponents: true,
  // Prefetch one App Shell per route; links with prefetch={true} (pagination,
  // filter chips) also prefetch the cached results for their URL.
  partialPrefetching: true,
  reactCompiler: true,
  typedRoutes: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "a.storyblok.com" }],
    qualities: [75],
    minimumCacheTTL: 14400,
  },
}

export default nextConfig
