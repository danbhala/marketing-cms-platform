# @platform/theme-studio

The theme studio's engine and UI, shared by the docs app (`/theme`, showcase pages) and the demo site.

- `theme`: the `Theme` shape, `themeToVars`, `themeToCss`, URL hash encoding and `useThemeOverride`.
- `presets`, `fonts`, `fonts-load`: starting themes and the self-hosted font list.
- `panels`, `controls`: the studio's tabs and inputs.
- `theme-editor`: the floating "Edit theme" pill and drawer.

The UI reads `--studio-*` variables (background, foreground, card, muted, muted-foreground, primary, primary-foreground) so each host app sets its own chrome. Import `@platform/theme-studio/studio.css` from the app's Tailwind entry and define those variables on `.studio-chrome`, the class the drawer and pill carry. (Not `theme-*`: the UI package paints any `theme-*` element with the site's own background.)

The demo site shows the editor only with the local adapter, or when `THEME_EDITOR=true`.
