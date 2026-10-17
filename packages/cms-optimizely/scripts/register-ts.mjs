// Lets `node --experimental-strip-types` import the workspace's TypeScript
// sources, which use extensionless specifiers (`./primitives`) that Node's ESM
// loader otherwise rejects. The hook in ts-resolver.mjs tries .ts/.tsx and
// /index.ts when a bare relative import does not resolve. No dependencies.
import { register } from "node:module"

register("./ts-resolver.mjs", import.meta.url)
