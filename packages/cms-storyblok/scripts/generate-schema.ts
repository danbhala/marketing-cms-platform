import { mkdirSync, writeFileSync } from "node:fs"
import { register } from "node:module"
import { fileURLToPath } from "node:url"

// Type-only, so strip-types erases it and Node never resolves it at runtime.
import type { generateComponents as GenerateComponents } from "../src/schema/index"

/**
 * Writes schema/components.json from the content model. Runs with plain
 * `node --experimental-strip-types`, so it needs no build step or tsx; the
 * resolve hook below lets Node follow the extensionless relative imports the
 * TypeScript sources use (the bundler resolution the rest of the repo relies on).
 */
register(new URL("./ts-resolve-hook.ts", import.meta.url))

const { generateComponents } = (await import("../src/schema/index")) as { generateComponents: typeof GenerateComponents }

const outDir = fileURLToPath(new URL("../schema/", import.meta.url))
mkdirSync(outDir, { recursive: true })
const file = `${outDir}components.json`
writeFileSync(file, `${JSON.stringify(generateComponents(), null, 2)}\n`)
console.log(`wrote ${file}`)
