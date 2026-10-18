import type { NextConfig } from "next"
import { createMDX } from "fumadocs-mdx/next"

const withMDX = createMDX()

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@platform/ui",
    "@platform/animation",
    "@platform/content-model",
    "@platform/cms-core",
    "@platform/cms-local",
  ],
  // Storybook's static build (copied to public/storybook) uses relative asset
  // URLs, so it is served from /storybook/ with the trailing slash. Next would
  // otherwise redirect that to /storybook; proxy.ts sends the bare path forward.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/storybook", destination: "/storybook/index.html" },
      {
        source: "/docs/:slug*.md",
        destination: "/llms.mdx/docs/:slug*/content.md",
      },
    ]
  },
  async headers() {
    return [
      // Storybook's own HTML has no robots meta tag; the header keeps it noindex.
      {
        source: "/storybook/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ]
  },
}

export default withMDX(nextConfig)
