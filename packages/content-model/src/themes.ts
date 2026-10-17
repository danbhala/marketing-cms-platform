/**
 * Theme names a page or block can opt into. Each maps to a `theme-<name>`
 * class defined in `@platform/ui/styles/themes.css`. Keep these two in sync:
 * the CMS schemas offer exactly these options in their theme dropdowns.
 */
export const themeNames = [
  "light",
  "dark",
  "brand",
  "muted",
  "blue",
  "green",
  "orange",
  "rose",
  "violet",
] as const;

export type ThemeName = (typeof themeNames)[number];

export const themeClassName = (theme?: ThemeName | null): string | undefined =>
  theme ? `theme-${theme}` : undefined;
