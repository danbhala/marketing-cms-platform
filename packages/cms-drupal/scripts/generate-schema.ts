/**
 * Writes the `platform_content` Drupal module under schema/ from the content
 * model: `pnpm schema:generate` (plain Node with type stripping; the resolve
 * hook comes from @platform/content-model/strip-types). The module folder is
 * emptied first so renamed fields do not leave stale config behind.
 */
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { generateModule, MODULE_NAME } from "../src/schema/index"

const outDir = fileURLToPath(new URL(`../schema/${MODULE_NAME}/`, import.meta.url))
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const files = generateModule()
for (const [path, content] of Object.entries(files)) {
  const target = join(outDir, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
}

const count = (dir: string): number =>
  readdirSync(dir).reduce((n, name) => n + (statSync(join(dir, name)).isDirectory() ? count(join(dir, name)) : 1), 0)
console.log(`wrote ${count(outDir)} files to ${outDir}`)
