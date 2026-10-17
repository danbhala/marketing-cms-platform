import type { NextConfig } from "next"
import { createMDX } from "fumadocs-mdx/next"

const withMDX = createMDX()

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@platform/ui", "@platform/content-model", "@platform/cms-core", "@platform/cms-local"],
}

export default withMDX(nextConfig)
