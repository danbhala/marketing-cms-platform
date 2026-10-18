// Lets plain `node --experimental-strip-types` run the workspace's TypeScript
// without a build step. The sources use extensionless relative imports
// (`./fields`, `../src/schema/index`), which Node's ESM loader rejects, so
// this hook retries a failed relative import with `.ts`, `.tsx` and
// `/index.ts`. Every adapter's schema generator loads it:
//
//   node --experimental-strip-types --import @platform/content-model/strip-types scripts/generate-schema.ts
import { registerHooks } from "node:module"

const retryable = new Set(["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"])
const hasExtension = /\.[cm]?[jt]sx?$/

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context)
    } catch (error) {
      if (!retryable.has(error?.code) || !specifier.startsWith(".") || hasExtension.test(specifier)) throw error
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
