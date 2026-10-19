import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"

import { demoUrl } from "./demo"
import { storybookUrl } from "./storybook"

/** Shared nav for the home and docs layouts. */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: "Marketing CMS Platform" },
    githubUrl: "https://github.com/danbhala/marketing-cms-platform",
    links: [
      { text: "Docs", url: "/docs" },
      { text: "Theme studio", url: "/theme" },
      { text: "Schema studio", url: "/schema" },
      { text: "Storybook", url: storybookUrl(), external: true },
      { text: "Demo site", url: demoUrl, external: true },
    ],
  }
}
