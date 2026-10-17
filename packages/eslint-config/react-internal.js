import pluginReactHooks from "eslint-plugin-react-hooks"
import storybook from "eslint-plugin-storybook"
import globals from "globals"

import { config as baseConfig } from "./base.js"

/**
 * ESLint configuration for React libraries (the UI package).
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  ...baseConfig,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  pluginReactHooks.configs.flat.recommended,
  ...storybook.configs["flat/recommended"],
]
