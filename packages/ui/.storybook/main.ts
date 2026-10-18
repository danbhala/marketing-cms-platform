import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

import type { StorybookConfig } from "@storybook/react-vite"
import remarkGfm from "remark-gfm"

/** Resolve a package's directory so pnpm's strict node_modules layout works. */
function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)))
}

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)", "../../animation/src/**/*.stories.@(ts|tsx)"],
  addons: [
    {
      name: getAbsolutePath("@storybook/addon-docs"),
      // GitHub-flavoured markdown so the tables in src/docs/*.mdx render.
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    getAbsolutePath("@storybook/addon-themes"),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-vitest"),
    getAbsolutePath("@storybook/addon-mcp"),
  ],
  framework: getAbsolutePath("@storybook/react-vite"),
  core: { disableTelemetry: true },
  typescript: {
    reactDocgen: "react-docgen-typescript",
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      // Keep the props table to our own props; skip DOM attribute noise.
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
}

export default config
