import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Cache Components: static shells are prerendered, data is cached with
  // `'use cache'` in lib/cms.ts and invalidated by tag from /api/revalidate.
  cacheComponents: true,
  reactCompiler: true,
  typedRoutes: true,
  // Workspace packages ship TypeScript source, so Next compiles them.
  transpilePackages: [
    "@platform/ui",
    "@platform/content-model",
    "@platform/cms-core",
    "@platform/cms-local",
    "@platform/cms-contentful",
    "@platform/cms-storyblok",
    "@platform/cms-optimizely",
    "@platform/cms-sanity",
    "@platform/component-registry",
  ],
  images: {
    // Asset hosts of every supported CMS. Only the configured one is used.
    remotePatterns: [
      { protocol: "https", hostname: "images.ctfassets.net" },
      { protocol: "https", hostname: "a.storyblok.com" },
      { protocol: "https", hostname: "*.cmp.optimizely.com" },
      { protocol: "https", hostname: "cdn.sanity.io" },
    ],
    qualities: [75],
    minimumCacheTTL: 14400,
  },
}

export default nextConfig
