import type { StudioModel } from "./model"

/**
 * A self-contained brief a person can paste into any LLM to have the block
 * added to a project built on the platform. Mirrors the theme studio's
 * "Copy prompt": everything the model needs is in the text.
 */
export function modelToPrompt(model: StudioModel, canonical: string, { shareUrl }: { shareUrl?: string } = {}): string {
  const { block, items } = model
  const pascal = block.type.charAt(0).toUpperCase() + block.type.slice(1)
  return [
    `Add the "${block.label || block.type}" block below to my project. Follow the steps, then report what you changed.`,
    "",
    "## Context",
    "",
    "The project is a Next.js marketing front-end built on a CMS-agnostic platform. Content types are declared once, in TypeScript, with a small set of field builders (`field.text()`, `field.select([...])`, `field.items([...])`, ...). From that one declaration the platform derives the TypeScript type, a zod validator, Storybook fixtures and the native schema of whichever CMS the project uses (Contentful, Storyblok, Optimizely SaaS, Sanity, Drupal or Wagtail). Never write a CMS schema by hand; change the definition and regenerate.",
    "",
    "## Steps",
    "",
    '1. Add the definitions from the "Definition" section to the content model.',
    "   - In the monorepo: `packages/content-model/src/definitions/blocks.ts` for the block and `items.ts` for item types; add the block to `allBlocks` and item types to `allItems`.",
    "   - In a project that copied the platform code: the same files under its `content-model` folder.",
    `   The block spreads \`presentation\`, the shared theme/spacing/anchor/animation fields every block has; keep that.`,
    "",
    `2. Export the content type: \`export type ${pascal} = InferContent<typeof ${block.type}>\` in \`types.ts\`${items.length ? `, and the same for ${items.map((i) => i.type).join(", ")}` : ""}, and add \`${pascal}\` to the \`Block\` union.`,
    "",
    `3. Add a fixture for the block in \`fixtures/content.ts\` with realistic copy (no lorem ipsum), then build the component in the UI package: \`blocks/${block.type}.tsx\` rendering every field, a story in \`${block.type}.stories.tsx\`, and register it in the block registry so the page renderer can map \`type: "${block.type}"\` to it.`,
    "",
    "4. Run `pnpm typecheck`, `pnpm test` and `pnpm schema:generate` in the CMS package the project uses, and commit the regenerated schema files with the change. Apply the schema to the CMS with that package's README instructions (migration script, CLI push, config import).",
    "",
    "## Definition",
    "",
    "```ts",
    canonical,
    "```",
    "",
    ...(shareUrl ? [`Edit this block in the schema studio: ${shareUrl}`] : []),
  ].join("\n")
}
