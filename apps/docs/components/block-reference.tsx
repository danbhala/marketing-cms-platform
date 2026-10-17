import type { Field } from "@platform/content-model"
import { allBlocks, allDocuments, allItems } from "@platform/content-model"
import { TypeTable } from "fumadocs-ui/components/type-table"

const definitions = [...allBlocks, ...allItems, ...allDocuments]

function describe(field: Field): string {
  switch (field.kind) {
    case "select":
      return field.options.map((o) => `"${o}"`).join(" | ")
    case "items":
    case "blocks":
      return `${field.of.map((d) => d.type).join(" | ")}[]`
    case "textList":
      return "string[]"
    case "richText":
      return "RichText"
    case "media":
      return `Media (${field.accept ?? "image"})`
    case "number":
      return "number"
    case "boolean":
      return "boolean"
    default:
      return "string"
  }
}

/**
 * Field table for one definition, rendered straight from the content model
 * so the docs cannot drift from the code.
 */
export function BlockReference({ type }: { type: string }) {
  const definition = definitions.find((d) => d.type === type)
  if (!definition) return <p>Unknown type “{type}”.</p>
  const rows = Object.fromEntries(
    Object.entries(definition.fields as Record<string, Field>).map(([name, field]) => [
      name,
      {
        type: describe(field),
        description: field.description ?? "",
        required: field.required,
        default: field.kind === "select" && field.defaultValue ? `"${field.defaultValue}"` : undefined,
      },
    ]),
  )
  return (
    <>
      {definition.description ? <p>{definition.description}</p> : null}
      <TypeTable type={rows} />
    </>
  )
}

/** Names of nested item types a block uses, for cross-linking. */
export function nestedTypes(type: string): string[] {
  const definition = definitions.find((d) => d.type === type)
  if (!definition) return []
  return Object.values(definition.fields as Record<string, Field>).flatMap((f) => (f.kind === "items" || f.kind === "blocks" ? f.of.map((d) => d.type) : []))
}
