import path from "node:path"
import { fileURLToPath } from "node:url"

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig, mergeConfig } from "vitest/config"

import viteConfig from "./vite.config"

const dirname = path.dirname(fileURLToPath(import.meta.url))

// CI images and sandboxes often ship a system Chromium instead of letting
// Playwright download one. Point this variable at it to reuse that binary.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH

// Two projects: "unit" runs *.test.ts(x) in jsdom, "storybook" turns every
// story into a browser test (render + play function + a11y) in Chromium.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            environment: "jsdom",
            include: ["src/**/*.test.{ts,tsx}"],
            setupFiles: ["./vitest.setup.ts"],
          },
        },
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: path.join(dirname, ".storybook"),
              storybookScript: "pnpm storybook --no-open",
            }),
          ],
          test: {
            name: "storybook",
            browser: {
              enabled: true,
              provider: playwright(executablePath ? { launchOptions: { executablePath } } : {}),
              headless: true,
              instances: [{ browser: "chromium" }],
            },
            setupFiles: ["./.storybook/vitest.setup.ts"],
          },
        },
      ],
    },
  })
)
