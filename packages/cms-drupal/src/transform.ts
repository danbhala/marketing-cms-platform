import type { ZodError } from "zod"

import type { AnyDefinition, Field, Page, SiteSettings } from "@platform/content-model"
import { page as pageDefinition, schemaFor, siteSettings as siteSettingsDefinition } from "@platform/content-model"

import type { JsonApiDocument, JsonApiRelationship, JsonApiResourceObject } from "./client"
import { editAttrsFor } from "./edit"
import { includedMap, mediaToMedia, resolve, type IncludedMap } from "./media"
import { htmlToAst, isEmptyHtml } from "./rich-text"
import { definitionForResourceType, fieldNameFor, resourceTypeFor } from "./schema/naming"

/**
 * Maps raw JSON:API documents to the canonical content shape. A page is a
 * `node--page` whose `field_blocks` references paragraphs; each paragraph's
 * `type` (`paragraph--hero`) picks the block or item definition and its
 * fields are read by the Drupal machine names the schema generator chose.
 * Everything is validated with the content model's zod schema so a site whose
 * fields drift from the generated module fails here, loudly, naming the entity
 * and field.
 *
 * Ids: documents use the node id (`drupal_internal__nid`) because that is what
 * Drupal's cache tags (`node:12`) and the `next` module's revalidation carry;
 * paragraphs use their uuid, the JSON:API id.
 */
export interface TransformOptions {
  /** Attach `$edit` (draft responses only). */
  edit: boolean
  /** Drupal origin, to make file URLs absolute. */
  baseUrl: string
  /** Drupal alias of the front page node; it renders at "/". */
  frontPage: string
}

export class TransformError extends Error {
  constructor(
    message: string,
    readonly entryId: string,
    readonly field?: string,
  ) {
    super(message)
    this.name = "DrupalTransformError"
  }
}

interface DrupalLink {
  uri?: string | null
  title?: string | null
  options?: unknown
}

interface DrupalText {
  value?: string | null
  format?: string | null
  processed?: string | null
}

/** `/home` (the front page alias) → `/`; otherwise the alias without a trailing slash. */
export function sitePath(alias: string | null | undefined, frontPage: string): string {
  const path = (alias ?? "").replace(/\/+$/, "")
  if (path === "" || path === frontPage.replace(/\/+$/, "")) return "/"
  return path.startsWith("/") ? path : `/${path}`
}

export function nodeToPage(doc: JsonApiDocument, options: TransformOptions): Page {
  const node = single(doc, resourceTypeFor(pageDefinition))
  const included = includedMap(doc.included)
  const attributes = node.attributes ?? {}
  const alias = (attributes.path as { alias?: string | null } | undefined)?.alias
  const nid = attributes.drupal_internal__nid
  // Nodes without an alias are still reachable at Drupal's canonical path.
  const path = alias ? sitePath(alias, options.frontPage) : `/node/${String(nid)}`
  return transformResource(node, pageDefinition, included, options, { path }) as Page
}

export function nodeToSiteSettings(doc: JsonApiDocument, options: TransformOptions): SiteSettings {
  const node = single(doc, resourceTypeFor(siteSettingsDefinition))
  return transformResource(node, siteSettingsDefinition, includedMap(doc.included), options) as SiteSettings
}

function single(doc: JsonApiDocument, expectedType: string): JsonApiResourceObject {
  const node = Array.isArray(doc.data) ? doc.data[0] : doc.data
  if (!node) throw new TransformError(`Expected one ${expectedType} resource, got none`, "")
  if (node.type !== expectedType) throw new TransformError(`Expected ${expectedType}, got ${node.type} ${node.id}`, node.id)
  return node
}

/**
 * One resource object (node root, block or item paragraph) to
 * `{ id, type, …fields }`, then validated. `overrides` supplies values the
 * model has but Drupal keeps outside configurable fields (the page path).
 */
export function transformResource(
  resource: JsonApiResourceObject,
  definition: AnyDefinition,
  included: IncludedMap,
  options: TransformOptions,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const attributes = resource.attributes ?? {}
  const relationships = resource.relationships ?? {}
  const nodeId = definition.kind === "document" ? String(attributes.drupal_internal__nid ?? resource.id) : resource.id
  const out: Record<string, unknown> = { id: nodeId, type: definition.type }

  for (const [name, field] of Object.entries(definition.fields as Record<string, Field>)) {
    if (name in overrides) {
      out[name] = overrides[name]
      continue
    }
    const machine = fieldNameFor(definition, name)
    const raw = field.kind === "media" || field.kind === "items" || field.kind === "blocks" ? relationships[machine]?.data : attributes[machine]
    const value = transformField(raw, field, included, options, nodeId, name)
    if (value !== undefined) out[name] = value
  }

  if (options.edit) {
    const edit = editAttrsFor(resource, definition.kind === "document" ? "node" : "paragraph")
    if (edit) out.$edit = edit
  }

  const result = schemaFor(definition).safeParse(out)
  if (!result.success) throw validationError(result.error, nodeId, definition.type)
  return result.data as Record<string, unknown>
}

function transformField(value: unknown, field: Field, included: IncludedMap, options: TransformOptions, entryId: string, name: string): unknown {
  switch (field.kind) {
    case "text":
    case "textarea":
    case "icon": {
      // Drupal returns null for an empty field; "" only when an editor cleared it. Both mean "unset".
      const text = typeof value === "string" ? value : ""
      return text === "" ? undefined : text
    }
    case "link": {
      const href = linkToHref(value, options.frontPage)
      return href === "" ? undefined : href
    }
    case "textList": {
      const list = Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry !== "") : typeof value === "string" && value ? [value] : []
      return list.length === 0 && !field.required ? undefined : list
    }
    case "richText": {
      const text = value as DrupalText | null | undefined
      const html = text?.processed ?? text?.value ?? null
      if (isEmptyHtml(html)) return field.required ? htmlToAst(html, options) : undefined
      return htmlToAst(html, options)
    }
    case "number": {
      if (value === "" || value === null || value === undefined) return undefined
      const n = typeof value === "number" ? value : Number(value)
      if (Number.isNaN(n)) throw new TransformError(`Field "${name}" of ${entryId} is not a number: ${String(value)}`, entryId, name)
      return n
    }
    case "boolean":
      return typeof value === "boolean" ? value : undefined
    case "media": {
      const rel = Array.isArray(value) ? (value[0] as JsonApiRelationship | undefined) : (value as JsonApiRelationship | null | undefined)
      // A reference to media the current user may not see is omitted from `included`; treat it as unset.
      return mediaToMedia(resolve(included, rel), included, options.baseUrl) ?? undefined
    }
    case "select": {
      const selected = typeof value === "string" ? value : ""
      if (selected === "") return field.required ? field.defaultValue : undefined
      if (!field.options.includes(selected)) {
        throw new TransformError(
          `Field "${name}" of ${entryId} has value "${selected}", expected one of ${field.options.join(", ")}`,
          entryId,
          name,
        )
      }
      return selected
    }
    case "items":
    case "blocks": {
      const rels = Array.isArray(value) ? (value as JsonApiRelationship[]) : []
      const out: Record<string, unknown>[] = []
      rels.forEach((rel, index) => {
        const resource = resolve(included, rel)
        // Unpublished or inaccessible paragraphs are left out of `included` (see `meta.omitted`); skip them.
        if (!resource) return
        const definition = definitionForResourceType(resource.type)
        const allowed = (field.of as AnyDefinition[]).find((d) => d.type === definition?.type)
        if (!definition || !allowed) {
          throw new TransformError(
            `Field "${name}" of ${entryId} holds a "${resource.type}" paragraph at index ${index}; allowed: ${(field.of as AnyDefinition[]).map(resourceTypeFor).join(", ")}`,
            entryId,
            name,
          )
        }
        out.push(transformResource(resource, definition, included, options))
      })
      return out
    }
  }
}

/**
 * Drupal `link` field → href. `internal:/pricing` and `base:pricing` are site
 * paths; `entity:node/5` is a node without an alias in the link, so Drupal's
 * canonical `/node/5` is used; `route:<front>` is the home page; external,
 * mailto and tel URIs pass through.
 */
export function linkToHref(value: unknown, frontPage: string): string {
  if (typeof value === "string") return value
  if (typeof value !== "object" || value === null) return ""
  const uri = (value as DrupalLink).uri ?? ""
  if (!uri) return ""
  if (uri.startsWith("internal:")) return sitePathWithSuffix(uri.slice("internal:".length), frontPage)
  if (uri.startsWith("base:")) return sitePathWithSuffix(`/${uri.slice("base:".length).replace(/^\/+/, "")}`, frontPage)
  if (uri.startsWith("entity:")) return `/${uri.slice("entity:".length)}`
  if (uri === "route:<front>") return "/"
  if (uri.startsWith("route:<nolink>") || uri.startsWith("route:<button>")) return ""
  return uri
}

/** Like `sitePath` but keeps a query string or fragment attached to the alias. */
function sitePathWithSuffix(path: string, frontPage: string): string {
  const match = /^([^?#]*)(.*)$/.exec(path)
  const base = match?.[1] ?? path
  const suffix = match?.[2] ?? ""
  return `${sitePath(base || "/", frontPage)}${suffix}`
}

function validationError(error: ZodError, entryId: string, type: string): TransformError {
  const issue = error.issues[0]
  const field = issue?.path.map(String).join(".") || undefined
  const detail = issue ? `${field ?? "(root)"}: ${issue.message}` : error.message
  return new TransformError(`Drupal ${type} ${entryId} failed validation at ${detail}`, entryId, field)
}
