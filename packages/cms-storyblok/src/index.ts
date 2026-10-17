import type { CmsAdapter } from "@platform/cms-core"

/** Placeholder until the storyblok adapter is implemented. */
export const storyblokAdapter: CmsAdapter = new Proxy({} as CmsAdapter, {
  get() {
    throw new Error("@platform/cms-storyblok is not implemented yet")
  },
})
