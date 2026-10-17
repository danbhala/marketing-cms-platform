// Copies the UI package's static Storybook into public/storybook so the docs
// deployment serves it at /storybook. Turbo builds it first (see turbo.json,
// docs#build depends on @platform/ui#build-storybook). A plain `next build`
// without that step still works: the docs then link to the local Storybook.
import { cp, rm, access } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const source = fileURLToPath(
  new URL("../../../packages/ui/storybook-static/", import.meta.url)
)
const target = fileURLToPath(new URL("../public/storybook/", import.meta.url))

const built = await access(source).then(
  () => true,
  () => false
)
await rm(target, { recursive: true, force: true })
if (!built) {
  console.warn(
    "[docs] packages/ui/storybook-static not found; /storybook will not be served by this build"
  )
} else {
  await cp(source, target, { recursive: true })
  console.log("[docs] copied Storybook to public/storybook")
}
