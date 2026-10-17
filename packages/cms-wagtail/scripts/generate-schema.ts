import { mkdirSync, writeFileSync } from "node:fs"
import { register } from "node:module"
import { fileURLToPath } from "node:url"

// Type-only, so strip-types erases it and Node never resolves it at runtime.
import type { generateSchema as GenerateSchema, renderFiles as RenderFiles } from "../src/schema/index"

/**
 * Writes the `platform_cms` Django app (blocks.py, models.py, api.py,
 * signals.py, apps.py, __init__.py) and schema.json from the content model.
 * Runs with plain `node --experimental-strip-types`, so it needs no build step
 * or tsx; the resolve hook lets Node follow the extensionless relative imports
 * the TypeScript sources use.
 */
register(new URL("./ts-resolve-hook.ts", import.meta.url))

const { generateSchema, renderFiles } = (await import("../src/schema/index")) as {
  generateSchema: typeof GenerateSchema
  renderFiles: typeof RenderFiles
}

const outDir = fileURLToPath(new URL("../schema/", import.meta.url))
const schema = generateSchema()
for (const [relativePath, contents] of Object.entries(renderFiles(schema))) {
  const file = `${outDir}${relativePath}`
  mkdirSync(file.slice(0, file.lastIndexOf("/")), { recursive: true })
  writeFileSync(file, contents)
  console.log(`wrote ${file}`)
}
