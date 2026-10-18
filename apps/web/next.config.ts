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
    "@platform/animation",
    "@platform/content-model",
    "@platform/cms-core",
    "@platform/cms-local",
    "@platform/cms-contentful",
    "@platform/cms-storyblok",
    "@platform/cms-optimizely",
    "@platform/cms-sanity",
    "@platform/cms-drupal",
    "@platform/cms-wagtail",
    "@platform/component-registry",
  ],
  images: {
    // Asset hosts of every supported CMS. Only the configured one is used.
    remotePatterns: [
      { protocol: "https", hostname: "images.ctfassets.net" },
      { protocol: "https", hostname: "a.storyblok.com" },
      { protocol: "https", hostname: "*.cmp.optimizely.com" },
      { protocol: "https", hostname: "cdn.sanity.io" },
      // Drupal serves files from its own origin; only known when the env is set.
      ...(process.env.NEXT_PUBLIC_DRUPAL_BASE_URL
        ? [{ protocol: new URL(process.env.NEXT_PUBLIC_DRUPAL_BASE_URL).protocol.replace(":", "") as "http" | "https", hostname: new URL(process.env.NEXT_PUBLIC_DRUPAL_BASE_URL).hostname }]
        : []),
    ],
    qualities: [75],
    minimumCacheTTL: 14400,
  },
}

export default nextConfig
