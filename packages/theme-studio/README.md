# @platform/theme-studio

The theme studio's engine and UI, shared by the docs app (`/theme`, showcase pages) and the demo site.

- `theme`: the `Theme` shape, `themeToVars`, `themeToCss`, `encodeTheme`/`decodeTheme`, and the stepped controls' tables (`spaceSteps`/`spaceVars` for Whitespace, `cardSizes`, `radiusSteps`, `widthSteps`).
- `store`: the theme kept in the URL hash, `useTheme`, `useThemeOverride`, `shareUrl`.
- `color`: OKLCH maths and contrast. `prompt`: `themeToPrompt`, the Copy prompt text.
- `presets`, `fonts`, `fonts-load`: starting themes and the self-hosted font list.
- `panels`, `controls`: the studio's tabs and inputs.
- `theme-editor`: the floating "Edit theme" pill and drawer: a bottom sheet on phones (peek, half, full), an overlay on tablets, docked from 64rem with the page narrowed beside it. Pass `preset` so the preset row (`preset-strip`) starts on it.

The UI reads `--studio-*` variables (background, foreground, card, muted, muted-foreground, primary, primary-foreground) so each host app sets its own chrome. Import `@platform/theme-studio/studio.css` from the app's Tailwind entry and define those variables on `.studio-chrome`, the class the drawer and pill carry. (Not `theme-*`: the UI package paints any `theme-*` element with the site's own background.)

The demo site shows the editor only with the local adapter, or when `THEME_EDITOR=true`. There it also calls `enableLiveAnimation()` so blocks resolve their animation in the browser and the Motion tab previews live; without the editor, animation resolves on the server as usual.
