import { config } from "@platform/eslint-config/react-internal"
import { noCmsImports } from "@platform/eslint-config/base"

export default [
  ...config,
  noCmsImports,
  // Node scripts (vendoring, screenshots) run outside the browser bundle.
  { files: ["scripts/**/*.mjs"], languageOptions: { globals: { process: "readonly", console: "readonly" } } },
]
