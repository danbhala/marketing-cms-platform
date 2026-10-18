/**
 * Writes the Optimizely content model to schema/: `pnpm schema:generate`
 * (plain Node with type stripping; the resolve hook comes from
 * @platform/content-model/strip-types).
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  describeAllContentTypes,
  renderBuildConfig,
  renderContentTypesJson,
  renderContentTypesModule,
} from "../src/schema/index"

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "schema")
const locales = (process.env.OPTIMIZELY_LOCALES ?? "en")
  .split(",")
  .map((l) => l.trim())
  .filter(Boolean)

const descriptions = describeAllContentTypes()
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, "content-types.ts"), renderContentTypesModule(descriptions))
writeFileSync(join(outDir, "content-types.json"), renderContentTypesJson(descriptions))
writeFileSync(join(outDir, "optimizely.config.mjs"), renderBuildConfig(locales))

console.log(`Wrote ${descriptions.length} content types to ${outDir}`)
