/**
 * Writes the Sanity Studio schema derived from @platform/content-model to
 * `schema/schemaTypes.ts` and `schema/schema.json`.
 *
 *   pnpm --filter @platform/cms-sanity schema:generate
 *
 * Runs on plain Node (`--experimental-strip-types`), no bundler. The workspace
 * sources use extensionless relative imports, which Node's ESM loader rejects,
 * so a tiny resolve hook retries them with `.ts` / `/index.ts` first.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { registerHooks } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      if (!specifier.startsWith(".") || /\.[cm]?[jt]sx?$/.test(specifier)) throw error
      for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
        try {
          return nextResolve(candidate, context)
        } catch {
          // try the next candidate
        }
      }
      throw error
    }
  },
})

const { generateSanitySchema, renderSchemaJson, renderSchemaModule } = await import("../src/schema/index.ts")

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "../schema")
mkdirSync(outDir, { recursive: true })

const types = generateSanitySchema()
writeFileSync(resolve(outDir, "schemaTypes.ts"), renderSchemaModule(types))
writeFileSync(resolve(outDir, "schema.json"), renderSchemaJson(types))

console.log(`Wrote ${types.length} Sanity types to ${outDir}/schemaTypes.ts and schema.json`)
