import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import turboPlugin from "eslint-plugin-turbo"
import tseslint from "typescript-eslint"

/**
 * Packages that may only be imported inside their own `packages/cms-*`
 * adapter. The Next.js app and the UI package must stay CMS-agnostic, so this
 * rule is the guard rail that keeps vendor SDKs out of them.
 */
export const cmsSdkPatterns = [
  "contentful",
  "contentful/*",
  "contentful-*",
  "@contentful/*",
  "@storyblok/*",
  "storyblok-js-client",
  "@optimizely/*",
  "next-sanity",
  "@sanity/*",
  "next-drupal",
  "next-drupal/*",
]

/** Apply to every package that must not know which CMS is in use. */
export const noCmsImports = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: cmsSdkPatterns,
            message:
              "CMS SDKs belong in packages/cms-*. Consume content through @platform/cms-core instead.",
          },
        ],
      },
    ],
  },
}

/**
 * Shared ESLint configuration for every package in the repository.
 * @type {import("eslint").Linter.Config[]}
 */
export const config = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: { turbo: turboPlugin },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: [
      "dist/**",
      ".next/**",
      ".source/**",
      "storybook-static/**",
      "generated/**",
      "coverage/**",
    ],
  },
)
