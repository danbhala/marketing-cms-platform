// Lets plain `node --experimental-strip-types` run the project's TypeScript
// without a build step. The sources use extensionless imports and the `@/`
// alias from tsconfig.json, which Node's ESM loader doesn't know, so this
// hook maps `@/` to the project root and retries with `.ts`, `.tsx` and
// `/index.ts`.
import { registerHooks } from "node:module"
import { pathToFileURL } from "node:url"

const root = pathToFileURL(`${process.cwd()}/`).href
const retryable = new Set(["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"])
const hasExtension = /\.[cm]?[jt]sx?$/

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) specifier = new URL(specifier.slice(2), root).href
    try {
      return next(specifier, context)
    } catch (error) {
      const local = specifier.startsWith(".") || specifier.startsWith("file:")
      if (!retryable.has(error?.code) || !local || hasExtension.test(specifier)) throw error
      for (const candidate of [`${specifier}.ts`, `${specifier}.tsx`, `${specifier}/index.ts`]) {
        try {
          return next(candidate, context)
        } catch {
          // try the next candidate
        }
      }
      throw error
    }
  },
})
