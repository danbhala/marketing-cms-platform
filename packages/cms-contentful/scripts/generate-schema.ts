/**
 * Writes schema/content-types.json and schema/migration.cjs from the shared
 * content model: `pnpm schema:generate` (plain Node with type stripping; the
 * resolve hook comes from @platform/content-model/strip-types).
 */
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { buildContentTypes, renderContentTypesJson, renderMigration } from "../src/schema/index"

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "../schema")
const contentTypes = buildContentTypes({ defaultLocale: process.env.CONTENTFUL_DEFAULT_LOCALE ?? "en-US" })

await mkdir(outDir, { recursive: true })
await writeFile(resolve(outDir, "content-types.json"), renderContentTypesJson(contentTypes))
await writeFile(resolve(outDir, "migration.cjs"), renderMigration(contentTypes))

console.log(`Wrote ${contentTypes.length} content types to ${outDir}`)
