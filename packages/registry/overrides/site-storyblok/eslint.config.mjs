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
  {
    // `Image` here is the platform's own component: alt comes from the CMS media record (`media.alt`),
    // not an `alt` prop, so Next's rule that treats every `Image` as next/image does not apply.
    rules: { "jsx-a11y/alt-text": ["warn", { elements: ["img"], img: [] }] },
  },
  {
    // Same convention as the platform: a leading underscore marks a deliberately unused name.
    rules: { "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }] },
  },
  {
    // The provider's plain <img> is the fallback when no host Image is passed; the app passes next/image.
    files: ["components/lib/ui-provider.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
])

export default eslintConfig
