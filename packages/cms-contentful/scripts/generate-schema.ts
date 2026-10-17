import { mkdir, writeFile } from "node:fs/promises"
import { register } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Writes schema/content-types.json and schema/migration.cjs from the shared
 * content model. Run with `pnpm schema:generate`
 * (`node --experimental-strip-types scripts/generate-schema.ts`); no bundler
 * or extra dependency is involved, see resolve-ts.mjs for the one hook.
 */
register("./resolve-ts.mjs", import.meta.url)

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, "../schema")

const { buildContentTypes, renderContentTypesJson, renderMigration } = await import("../src/schema/index.ts")

const contentTypes = buildContentTypes({ defaultLocale: process.env.CONTENTFUL_DEFAULT_LOCALE ?? "en-US" })

await mkdir(outDir, { recursive: true })
await writeFile(resolve(outDir, "content-types.json"), renderContentTypesJson(contentTypes))
await writeFile(resolve(outDir, "migration.cjs"), renderMigration(contentTypes))

console.log(`Wrote ${contentTypes.length} content types to ${outDir}`)
