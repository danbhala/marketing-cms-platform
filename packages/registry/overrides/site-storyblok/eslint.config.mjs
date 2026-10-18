import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The field DSL infers content types from definitions; `{}` and `any`
    // there are deliberate type-level building blocks.
    files: ["lib/content-model/fields.ts"],
    rules: { "@typescript-eslint/no-empty-object-type": "off", "@typescript-eslint/no-explicit-any": "off" },
  },
  {
    // Leaving preview must be a full request to the API route, not a client navigation.
    files: ["lib/cms-*/bridge.tsx"],
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
])

export default eslintConfig
