---
name: add-block
description: Add or change a marketing block end to end (content model → fixture → UI component → story → docs → CMS schemas). Use when asked to add a block, add a field to a block, or add a new item type.
---

# Add a block

A block is declared once in the content model; everything else derives from it. Do the steps in this order so types drive the component.

1. **Define it** in `packages/content-model/src/definitions/blocks.ts` with `defineBlock("<type>", { label, fields })`. Reuse `heading` and spread `...presentation` last so every block has `theme`, `spacing`, `anchor` and the animation fields. Nested repeatables are items from `definitions/items.ts` via `field.items([item], { max })`. Add it to `allBlocks` in the same file and export `<Name>Block = InferContent<typeof defs.<type>>` from `types.ts`.
2. **Fixture** in `packages/content-model/src/fixtures/content.ts`: `export const <type>Block: <Name>Block = { id: "blk-<type>", type: "<type>", ... }`, add it to `allBlockFixtures`, and place it on a page composition if it belongs there. Use `placeholderMedia()` for images.
3. **Component** in `packages/ui/src/blocks/<kebab>.tsx`, mirroring `stats.tsx`: root is `<BlockSection block={block}>`, props type `BlockComponentProps<<Name>Block>`, `SectionHeader` with `source={block}` and `as={index === 0 ? "h1" : "h2"}`, `fieldAttrs(block, "<field>")` on the element that renders each editable field, `key={item.id}` on repeats. Wrap the header and each repeated item in `<BlockItem block={block}>` (from `./block-section`) so `animationStagger` can reveal them one by one; it renders nothing extra when the block is not animated. A block that renders its own `Heading` instead of `SectionHeader` passes `animation={headingAnimationSettings(block)}` so `headingAnimation` works on it. No CMS imports, no Next imports; links and images go through atoms (`Link`, `Image`).
4. **Register** in `packages/ui/src/blocks/index.ts` (`blockComponents` map and the named export).
5. **Story** `packages/ui/src/blocks/<kebab>.stories.tsx` with `title: "Blocks/<Label>"`, `args: { block: fixtures.<type>Block }`, one story per layout/variant and one themed variant. Tests run the stories with axe, so check contrast on themed variants.
6. **Docs** page `apps/docs/content/docs/blocks/<type>.mdx` (copy `stats.mdx`; frontmatter description in quotes) and add it to `blocks/meta.json`.
7. **Schemas**: `pnpm schema:generate` regenerates every `packages/cms-*/schema/`. Commit the generated files; the adapter tests assert they match.
8. Run `/platform:checks`.

Removing or renaming a field is a breaking content change for every CMS: say so in the PR and regenerate the schemas.
