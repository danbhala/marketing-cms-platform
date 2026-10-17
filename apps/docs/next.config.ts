import type { NextConfig } from "next"
import { createMDX } from "fumadocs-mdx/next"

const withMDX = createMDX()

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@platform/ui",
    "@platform/content-model",
    "@platform/cms-core",
    "@platform/cms-local",
  ],
  async rewrites() {
    return [
      {
        source: "/docs/:slug*.md",
        destination: "/llms.mdx/docs/:slug*/content.md",
      },
    ]
  },
}

export default withMDX(nextConfig)
