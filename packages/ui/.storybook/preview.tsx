import { withThemeByClassName } from "@storybook/addon-themes"
import type { Preview, ReactRenderer } from "@storybook/react-vite"

import "../src/styles/globals.css"

/**
 * The theme toolbar switches the same `theme-*` classes the app uses (see
 * src/styles/themes.css), applied to the story root. "Light" is the bare
 * token set, so it maps to no class at all.
 */
const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: { test: "error" },
    docs: { toc: true },
    options: {
      storySort: {
        order: [
          "Docs",
          ["Introduction", "Theming", "Component model"],
          "Atoms",
          "Molecules",
          "Blocks",
          "Templates",
          "Primitives",
        ],
      },
    },
  },
  decorators: [
    withThemeByClassName<ReactRenderer>({
      themes: {
        light: "",
        dark: "theme-dark",
        brand: "theme-brand",
        "brand + blue": "theme-blue theme-brand",
        blue: "theme-blue",
        green: "theme-green",
        orange: "theme-orange",
        rose: "theme-rose",
        violet: "theme-violet",
        "dark + violet": "theme-dark theme-violet",
      },
      defaultTheme: "light",
    }),
  ],
  tags: ["autodocs"],
}

export default preview
