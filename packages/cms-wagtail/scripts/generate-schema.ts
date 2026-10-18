/**
 * Writes the `platform_cms` Django app (blocks.py, models.py, api.py,
 * signals.py, apps.py, __init__.py) and schema.json from the content model:
 * `pnpm schema:generate` (plain Node with type stripping; the resolve hook
 * comes from @platform/content-model/strip-types).
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { generateSchema, renderFiles } from "../src/schema/index"

const outDir = fileURLToPath(new URL("../schema/", import.meta.url))
const schema = generateSchema()
for (const [relativePath, contents] of Object.entries(renderFiles(schema))) {
  const file = `${outDir}${relativePath}`
  mkdirSync(file.slice(0, file.lastIndexOf("/")), { recursive: true })
  writeFileSync(file, contents)
  console.log(`wrote ${file}`)
}
