import { withThemeByClassName } from "@storybook/addon-themes"
import type { Preview, ReactRenderer } from "@storybook/react-vite"

import { baseAnimationDefaults, defineAnimation, type AnimationDefaults } from "@platform/content-model"

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
    // Stories render with the platform's animation defaults (everything off)
    // unless they set `parameters.animation`, the site config a block inherits.
    (Story, { parameters }) => {
      defineAnimation((parameters.animation as Partial<AnimationDefaults> | undefined) ?? baseAnimationDefaults)
      return <Story />
    },
    // Blocks and molecules size themselves by their `section` container
    // (see src/styles/globals.css), so stories rendered outside a Section
    // still get one that is as wide as the viewport.
    (Story) => (
      <div className="@container/section">
        <Story />
      </div>
    ),
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
