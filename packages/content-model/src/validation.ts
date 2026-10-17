import { z } from "zod"

import type { AnyDefinition, Field, Fields } from "./fields"

/**
 * Runtime validators derived from the same definitions that produce the types.
 * Adapters run every normalised document through `schemaFor(definition)` so a
 * CMS misconfiguration fails loudly at the adapter boundary instead of as a
 * rendering bug.
 */

const markSchema = z.enum(["bold", "italic", "underline", "strikethrough", "code"])

export const mediaSchema = z.object({
  kind: z.enum(["image", "video"]),
  url: z.string().min(1),
  alt: z.string(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
})

const textNode = z.object({
  type: z.literal("text"),
  value: z.string(),
  marks: z.array(markSchema).optional(),
})
const breakNode = z.object({ type: z.literal("break") })
const linkNode = z.object({
  type: z.literal("link"),
  href: z.string(),
  children: z.array(textNode),
})
const inlineNode = z.union([textNode, linkNode, breakNode])

// z.lazy gives us the recursive block tree without a hand-written type.
const blockNode: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("paragraph"), children: z.array(inlineNode) }),
    z.object({
      type: z.literal("heading"),
      level: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
      children: z.array(inlineNode),
    }),
    z.object({ type: z.literal("listItem"), children: z.array(blockNode) }),
    z.object({
      type: z.literal("list"),
      ordered: z.boolean(),
      children: z.array(z.object({ type: z.literal("listItem"), children: z.array(blockNode) })),
    }),
    z.object({ type: z.literal("blockquote"), children: z.array(blockNode) }),
    z.object({ type: z.literal("thematicBreak") }),
    z.object({ type: z.literal("image"), media: mediaSchema }),
    z.object({ type: z.literal("codeBlock"), code: z.string(), language: z.string().optional() }),
  ]),
)

export const richTextSchema = z.object({
  type: z.literal("root"),
  children: z.array(blockNode),
})

/** Edit attributes an adapter attaches in draft mode. Always optional. */
export const editableSchema = z
  .object({
    self: z.record(z.string(), z.string()).optional(),
    fields: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  })
  .optional()

const cache = new WeakMap<AnyDefinition, z.ZodType>()

function fieldSchema(field: Field): z.ZodType {
  switch (field.kind) {
    case "text":
    case "textarea":
    case "link":
    case "icon":
      return z.string()
    case "textList":
      return z.array(z.string())
    case "richText":
      return richTextSchema
    case "number":
      return z.number()
    case "boolean":
      return z.boolean()
    case "media":
      return mediaSchema
    case "select":
      return z.enum(field.options as [string, ...string[]])
    case "items":
    case "blocks":
      return z.array(z.union(field.of.map((d) => schemaFor(d)) as [z.ZodType, z.ZodType, ...z.ZodType[]] | [z.ZodType]))
  }
}

function fieldsSchema(fields: Fields) {
  const shape: Record<string, z.ZodType> = {}
  for (const [key, field] of Object.entries(fields)) {
    const base = fieldSchema(field)
    shape[key] = field.required ? base : base.optional()
  }
  return shape
}

/** Build (and memoise) the zod schema for one definition. */
export function schemaFor(definition: AnyDefinition): z.ZodType {
  const hit = cache.get(definition)
  if (hit) return hit
  const schema = z.object({
    id: z.string().min(1),
    type: z.literal(definition.type),
    $edit: editableSchema,
    ...fieldsSchema(definition.fields),
  })
  cache.set(definition, schema)
  return schema
}
