import type { CmsAdapter } from "@platform/cms-core"

/** Placeholder until the sanity adapter is implemented. */
export const sanityAdapter: CmsAdapter = new Proxy({} as CmsAdapter, {
  get() {
    throw new Error("@platform/cms-sanity is not implemented yet")
  },
})
