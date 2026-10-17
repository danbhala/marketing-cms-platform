import { setProjectAnnotations } from "@storybook/react-vite"
import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview"

import * as projectAnnotations from "./preview"

// Applies the Storybook preview (global CSS, decorators, theme globals) to
// every story-as-test so they render exactly as in Storybook.
setProjectAnnotations([a11yAddonAnnotations, projectAnnotations])
