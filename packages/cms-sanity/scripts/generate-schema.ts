/**
 * Writes the Sanity Studio schema derived from @platform/content-model to
 * schema/schemaTypes.ts and schema/schema.json: `pnpm schema:generate` (plain
 * Node with type stripping; the resolve hook comes from
 * @platform/content-model/strip-types).
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { generateSanitySchema, renderSchemaJson, renderSchemaModule } from "../src/schema/index"

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "../schema")
mkdirSync(outDir, { recursive: true })

const types = generateSanitySchema()
writeFileSync(resolve(outDir, "schemaTypes.ts"), renderSchemaModule(types))
writeFileSync(resolve(outDir, "schema.json"), renderSchemaJson(types))

console.log(`Wrote ${types.length} Sanity types to ${outDir}/schemaTypes.ts and schema.json`)
