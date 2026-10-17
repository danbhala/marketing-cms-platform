import { access } from "node:fs/promises"
import { URL, fileURLToPath } from "node:url"

/**
 * Node's `--experimental-strip-types` runs TypeScript directly but keeps
 * ESM's strict resolution, while the workspace sources use extensionless
 * relative imports (`./fields`, `./definitions`). This hook retries such
 * failures with `.ts` and `/index.ts`, which is all the schema generator
 * needs to import `@platform/content-model` without a bundler.
 */
const retryable = new Set(["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"])

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context)
  } catch (error) {
    if (!retryable.has(error?.code) || !specifier.startsWith(".")) throw error
    for (const suffix of [".ts", "/index.ts"]) {
      const candidate = new URL(specifier + suffix, context.parentURL)
      try {
        await access(fileURLToPath(candidate))
        return next(candidate.href, context)
      } catch {
        // try the next suffix
      }
    }
    throw error
  }
}
