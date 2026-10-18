import { withThemeByClassName } from "@storybook/addon-themes"
import type { Preview, ReactRenderer } from "@storybook/react-vite"

import { baseAnimationDefaults, defineAnimation, type AnimationDefaults } from "@platform/content-model"
import { cardSizes, spaceSteps, spaceVars, type CardSize, type SpaceStep } from "@platform/theme-studio/theme"

import "../src/styles/globals.css"

/**
 * The theme toolbar switches the same `theme-*` classes the app uses (see
 * src/styles/themes.css), applied to the story root. "Light" is the bare
 * token set, so it maps to no class at all. Whitespace and Card size set the
 * same variables as the theme studio's controls of those names.
 */
const preview: Preview = {
  globalTypes: {
    whitespace: {
      description: "Whitespace step",
      toolbar: { title: "Whitespace", icon: "expand", items: [...spaceSteps], dynamicTitle: true },
    },
    cards: {
      description: "Card size (narrowest a grid card gets)",
      toolbar: { title: "Card size", icon: "grid", items: Object.keys(cardSizes), dynamicTitle: true },
    },
  },
  initialGlobals: { whitespace: "balanced", cards: "medium" },
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
    (Story, { globals }) => (
      <div
        className="@container/section"
        style={{
          ...spaceVars((globals.whitespace as SpaceStep | undefined) ?? "balanced"),
          "--card-min": `${cardSizes[(globals.cards as CardSize | undefined) ?? "medium"]}rem`,
        }}
      >
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
