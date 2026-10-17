import { config } from "@platform/eslint-config/next"
import { noCmsImports } from "@platform/eslint-config/base"

/**
 * The app is CMS-agnostic: it may import adapters only through cms.config.ts,
 * which is the one file allowed to name a CMS package.
 */
export default [
  ...config,
  { ...noCmsImports, ignores: ["cms.config.ts", "cms.bridges.ts"] },
  { ignores: [".next/**", "next-env.d.ts"] },
]
