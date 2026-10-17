import type { CmsAdapter } from "@platform/cms-core"

/** Placeholder until the optimizely adapter is implemented. */
export const optimizelyAdapter: CmsAdapter = new Proxy({} as CmsAdapter, {
  get() {
    throw new Error("@platform/cms-optimizely is not implemented yet")
  },
})
