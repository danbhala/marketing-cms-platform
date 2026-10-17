import { config } from "@platform/eslint-config/base"

export default [
  ...config,
  {
    // The field DSL relies on empty interfaces as distinct field types, `{}` as
    // the "no options" default of const generics, and `any` in the variance
    // positions of AnyDefinition. Each is deliberate and documented in fields.ts.
    files: ["src/fields.ts"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]
