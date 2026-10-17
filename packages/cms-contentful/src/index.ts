import type { CmsAdapter } from "@platform/cms-core"

/** Placeholder until the contentful adapter is implemented. */
export const contentfulAdapter: CmsAdapter = new Proxy({} as CmsAdapter, {
  get() {
    throw new Error("@platform/cms-contentful is not implemented yet")
  },
})
