/**
 * Writes schema/components.json from the content model: `pnpm schema:generate`
 * (plain Node with type stripping; the resolve hook comes from
 * @platform/content-model/strip-types).
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { generateComponents } from "../src/schema/index"

const outDir = fileURLToPath(new URL("../schema/", import.meta.url))
mkdirSync(outDir, { recursive: true })
const file = `${outDir}components.json`
writeFileSync(file, `${JSON.stringify(generateComponents(), null, 2)}\n`)
console.log(`wrote ${file}`)
