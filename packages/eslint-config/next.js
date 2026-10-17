import pluginNext from "@next/eslint-plugin-next"
import pluginReactHooks from "eslint-plugin-react-hooks"
import globals from "globals"

import { config as baseConfig } from "./base.js"

/**
 * ESLint configuration for Next.js apps.
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  ...baseConfig,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  pluginNext.configs.recommended,
  pluginNext.configs["core-web-vitals"],
  pluginReactHooks.configs.flat.recommended,
]
