# @platform/eslint-config

Shared flat ESLint configs.

| Import | Use in |
| --- | --- |
| `@platform/eslint-config/base` | Any package. Also exports `noCmsImports`, the rule that keeps `@platform/cms-*` imports out of the app. |
| `@platform/eslint-config/next` | Next.js apps (adds the Next and React Hooks plugins). |
| `@platform/eslint-config/react-internal` | React libraries such as `@platform/ui` (adds the Storybook plugin). |
