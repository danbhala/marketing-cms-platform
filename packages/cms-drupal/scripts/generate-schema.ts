import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { register } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

// Type-only, so strip-types erases it and Node never resolves it at runtime.
import type { generateModule as GenerateModule, MODULE_NAME as ModuleName } from "../src/schema/index"

/**
 * Writes the `platform_content` Drupal module under schema/ from the content
 * model. Runs with plain `node --experimental-strip-types`, so it needs no
 * build step or tsx; the resolve hook lets Node follow the extensionless
 * relative imports the TypeScript sources use. The module folder is emptied
 * first so renamed fields do not leave stale config behind.
 */
register(new URL("./ts-resolve-hook.ts", import.meta.url))

const { generateModule, MODULE_NAME } = (await import("../src/schema/index")) as { generateModule: typeof GenerateModule; MODULE_NAME: typeof ModuleName }

const outDir = fileURLToPath(new URL(`../schema/${MODULE_NAME}/`, import.meta.url))
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const files = generateModule()
for (const [path, content] of Object.entries(files)) {
  const target = join(outDir, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
}

const count = (dir: string): number => readdirSync(dir).reduce((n, name) => n + (statSync(join(dir, name)).isDirectory() ? count(join(dir, name)) : 1), 0)
console.log(`wrote ${count(outDir)} files to ${outDir}`)
