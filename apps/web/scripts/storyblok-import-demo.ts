/**
 * Loads the Harbor & Co demo content into a Storyblok space, so the same site
 * the local adapter serves can be tested against a real CMS. Run `cms:push`
 * (or the scaffolded site's equivalent) first, then:
 *
 *   STORYBLOK_SPACE_ID=… STORYBLOK_MANAGEMENT_TOKEN=… pnpm --filter web demo:storyblok
 *
 * It uploads every photo once, creates folders for /destinations and /news
 * (their index pages become folder start pages), and creates or updates one
 * story per document, published. Run it again to reset the space's demo
 * content; stories are matched by full slug, assets by file name.
 */
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import type {
  AnyDefinition,
  AnyDocumentDefinition,
  Article,
  Field,
  Media,
  Page,
  RichText,
} from "@platform/content-model"
import {
  article as articleDefinition,
  category as categoryDefinition,
  page as pageDefinition,
  siteSettings as siteSettingsDefinition,
} from "@platform/content-model"

import { demoContent } from "../content"

const managementHosts: Record<string, string> = {
  eu: "https://mapi.storyblok.com",
  us: "https://api-us.storyblok.com",
  ca: "https://api-ca.storyblok.com",
  ap: "https://api-ap.storyblok.com",
  cn: "https://app.storyblokchina.cn",
}
const spaceId = process.env.STORYBLOK_SPACE_ID
const token = process.env.STORYBLOK_MANAGEMENT_TOKEN
const host = managementHosts[process.env.STORYBLOK_REGION ?? "eu"]
if (!spaceId || !token || !host) {
  console.error("Set STORYBLOK_SPACE_ID, STORYBLOK_MANAGEMENT_TOKEN and a valid STORYBLOK_REGION.")
  process.exit(1)
}
const api = `${host}/v1/spaces/${spaceId}`
const publicDir = fileURLToPath(new URL("../public", import.meta.url))
const wait = () => new Promise((resolve) => setTimeout(resolve, 350)) // stay under the rate limit

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(path.startsWith("http") ? path : `${api}${path}`, {
      ...init,
      headers: { Authorization: token!, "Content-Type": "application/json" },
    })
    await wait()
    if (response.status === 429 && attempt < 5) continue
    if (!response.ok) throw new Error(`${init?.method ?? "GET"} ${path}: ${response.status} ${await response.text()}`)
    const text = await response.text()
    return (text ? JSON.parse(text) : {}) as T
  }
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

type Asset = { id: number; filename: string }
const assets = new Map<string, Asset>()

/** File name and bytes for a demo media URL: a file in public/ or an inline SVG placeholder. */
function sourceFor(media: Media): { name: string; type: string; body: Buffer } {
  if (media.url.startsWith("data:")) {
    const [meta, data] = media.url.slice(5).split(",", 2)
    const type = meta!.split(";")[0]!
    const body = meta!.includes(";base64") ? Buffer.from(data!, "base64") : Buffer.from(decodeURIComponent(data!))
    const name = `${media.alt.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.svg`
    return { name, type, body }
  }
  const name = media.url.split("/").pop()!
  return { name, type: "image/jpeg", body: readFileSync(`${publicDir}${media.url}`) }
}

async function uploadAsset(media: Media): Promise<Asset> {
  const cached = assets.get(media.url)
  if (cached) return cached
  const { name, type, body } = sourceFor(media)
  const existing = (await call<{ assets: Asset[] }>(`/assets?search=${encodeURIComponent(name)}`)).assets.find((a) =>
    a.filename.endsWith(`/${name}`)
  )
  let asset = existing
  if (!asset) {
    // Storyblok puts the size in the asset URL, which is where the adapter reads width and height.
    const size = media.width && media.height ? `${media.width}x${media.height}` : ""
    const signed = await call<{ id: number; pretty_url: string; post_url: string; fields: Record<string, string> }>(
      "/assets",
      { method: "POST", body: JSON.stringify({ filename: name, size }) }
    )
    const form = new FormData()
    for (const [key, value] of Object.entries(signed.fields)) form.append(key, value)
    form.append("file", new Blob([new Uint8Array(body)], { type }), name)
    const upload = await fetch(signed.post_url, { method: "POST", body: form })
    if (!upload.ok) throw new Error(`Upload of ${name} failed: ${upload.status}`)
    await call(`/assets/${signed.id}/finish_upload`)
    asset = { id: signed.id, filename: `https:${signed.pretty_url}` }
    console.log(`uploaded ${name}`)
  }
  const filename = asset.filename.startsWith("//") ? `https:${asset.filename}` : asset.filename
  assets.set(media.url, { id: asset.id, filename })
  return assets.get(media.url)!
}

async function uploadAll(value: unknown): Promise<void> {
  if (Array.isArray(value)) {
    for (const item of value) await uploadAll(item)
  } else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    if (record.kind === "image" || record.kind === "video") await uploadAsset(record as unknown as Media)
    for (const child of Object.values(record)) await uploadAll(child)
  }
}

// ---------------------------------------------------------------------------
// Canonical content → Storyblok content (the inverse of the adapter's transform)
// ---------------------------------------------------------------------------

/** Site path → { uuid, full_slug } of the story created for it; empty on the first pass. */
const storiesByPath = new Map<string, { uuid: string; fullSlug: string }>()
/** Canonical document id → story uuid, for reference fields. */
const uuidsById = new Map<string, string>()

function multilink(href: string) {
  if (href.startsWith("mailto:")) return { fieldtype: "multilink", linktype: "email", email: href.slice(7) }
  const [path, anchor] = href.split("#", 2)
  const story = path ? storiesByPath.get(path) : undefined
  if (story)
    return {
      fieldtype: "multilink",
      linktype: "story",
      id: story.uuid,
      cached_url: story.fullSlug,
      anchor: anchor ?? "",
    }
  return { fieldtype: "multilink", linktype: "url", url: href, cached_url: href }
}

function assetField(media: Media) {
  const asset = assets.get(media.url)!
  return { fieldtype: "asset", id: asset.id, filename: asset.filename, alt: media.alt, name: "", title: "", focus: "" }
}

type SbNode = { type: string; attrs?: Record<string, unknown>; content?: SbNode[]; text?: string; marks?: unknown[] }
type AstNode = RichText["children"][number]
type AstInline = Extract<AstNode, { type: "paragraph" }>["children"][number]

const markNames: Record<string, string> = { strikethrough: "strike" }

function inlineNodes(nodes: AstInline[], link?: string): SbNode[] {
  return nodes.flatMap((node): SbNode[] => {
    if (node.type === "break") return [{ type: "hard_break" }]
    if (node.type === "link") return inlineNodes(node.children, node.href)
    const marks: unknown[] = (node.marks ?? []).map((mark) => ({ type: markNames[mark] ?? mark }))
    if (link) marks.push({ type: "link", attrs: { href: link, linktype: "url", target: null } })
    return [{ type: "text", text: node.value, ...(marks.length ? { marks } : {}) }]
  })
}

function blockNodes(nodes: AstNode[]): SbNode[] {
  return nodes.map((node): SbNode => {
    switch (node.type) {
      case "paragraph":
        return { type: "paragraph", content: inlineNodes(node.children) }
      case "heading":
        return { type: "heading", attrs: { level: node.level }, content: inlineNodes(node.children) }
      case "list":
        return {
          type: node.ordered ? "ordered_list" : "bullet_list",
          content: node.children.map((item) => ({ type: "list_item", content: blockNodes(item.children) })),
        }
      case "blockquote":
        return { type: "blockquote", content: blockNodes(node.children) }
      case "thematicBreak":
        return { type: "horizontal_rule" }
      case "codeBlock":
        return {
          type: "code_block",
          attrs: { class: node.language ? `language-${node.language}` : "" },
          content: [{ type: "text", text: node.code }],
        }
      case "image":
        return { type: "image", attrs: { src: assets.get(node.media.url)!.filename, alt: node.media.alt } }
      default:
        throw new Error(`No Storyblok rich text node for "${(node as { type: string }).type}"`)
    }
  })
}

function fieldValue(value: unknown, field: Field): unknown {
  if (value === undefined || value === null) return undefined
  switch (field.kind) {
    case "link":
      return multilink(value as string)
    case "media":
      return assetField(value as Media)
    case "richText":
      return { type: "doc", content: blockNodes((value as RichText).children) }
    case "textList":
      return (value as string[]).map((text) => ({ _uid: crypto.randomUUID(), component: "textItem", text }))
    case "date":
      // Storyblok's datetime field is "YYYY-MM-DD HH:MM".
      return (value as string).includes("T") ? (value as string).slice(0, 16).replace("T", " ") : `${value} 00:00`
    case "number":
      return String(value)
    case "reference": {
      const ids = (Array.isArray(value) ? value : [value]).map((doc) => uuidsById.get((doc as { id: string }).id))
      return field.multiple ? ids.filter(Boolean) : (ids[0] ?? "")
    }
    case "items":
    case "blocks":
      return (value as { type: string }[]).map((item) => {
        const definition = (field.of as AnyDefinition[]).find((d) => d.type === item.type)!
        return toBlok(item as Record<string, unknown>, definition)
      })
    default:
      return value
  }
}

function toBlok(node: Record<string, unknown>, definition: AnyDefinition): Record<string, unknown> {
  const out: Record<string, unknown> = { _uid: crypto.randomUUID(), component: definition.type }
  for (const [name, field] of Object.entries(definition.fields as Record<string, Field>)) {
    // The story slug carries these, as in the generated schema.
    if ((definition.routable && name === "path") || (definition.taxonomy && name === "slug")) continue
    const converted = fieldValue(node[name], field)
    if (converted !== undefined) out[name] = converted
  }
  return out
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

type Story = { id: number; uuid: string; full_slug: string }
interface Entry {
  name: string
  slug: string
  parent?: string
  startpage?: boolean
  doc: Record<string, unknown>
  definition: AnyDocumentDefinition
  path?: string
}

async function findStory(fullSlug: string): Promise<Story | undefined> {
  const { stories } = await call<{ stories: Story[] }>(`/stories?with_slug=${encodeURIComponent(fullSlug)}`)
  return stories[0]
}

const folders = new Map<string, number>()
async function folder(slug: string, name: string): Promise<number> {
  const cached = folders.get(slug)
  if (cached) return cached
  const existing = (
    await call<{ stories: (Story & { is_folder: boolean })[] }>(`/stories?folder_only=1&with_slug=${slug}`)
  ).stories[0]
  const id =
    existing?.id ??
    (
      await call<{ story: Story }>("/stories", {
        method: "POST",
        body: JSON.stringify({ story: { name, slug, is_folder: true } }),
      })
    ).story.id
  folders.set(slug, id)
  return id
}

/** Where each document lives: index pages of nested sections become folder start pages. */
function entries(): Entry[] {
  const nested = new Set(
    demoContent.pages.flatMap((p) => (p.path.split("/").length > 2 ? [p.path.split("/")[1]!] : []))
  )
  for (const a of demoContent.articles) nested.add(a.path.split("/")[1]!)
  const routable = (doc: Page | Article, definition: AnyDocumentDefinition): Entry => {
    const parts = doc.path.split("/").filter(Boolean)
    const base = { name: doc.title, doc: { ...doc }, definition, path: doc.path }
    if (parts.length === 0) return { ...base, slug: "home" }
    if (parts.length === 1 && nested.has(parts[0]!))
      return { ...base, slug: parts[0]!, parent: parts[0]!, startpage: true }
    if (parts.length === 1) return { ...base, slug: parts[0]! }
    return { ...base, slug: parts.at(-1)!, parent: parts.slice(0, -1).join("/") }
  }
  return [
    ...demoContent.categories.map((c): Entry => ({
      name: c.title,
      slug: c.slug,
      parent: "categories",
      doc: { ...c },
      definition: categoryDefinition,
    })),
    ...demoContent.pages.map((p) => routable(p, pageDefinition)),
    ...demoContent.articles.map((a) => routable(a, articleDefinition)),
    {
      name: "Site settings",
      slug: "site-settings",
      doc: { ...demoContent.settings },
      definition: siteSettingsDefinition,
    },
  ]
}

async function save(entry: Entry, publish: boolean): Promise<Story> {
  const parentId = entry.parent
    ? await folder(entry.parent, entry.parent.charAt(0).toUpperCase() + entry.parent.slice(1))
    : 0
  const fullSlug = entry.parent ? `${entry.parent}/${entry.startpage ? "" : entry.slug}` : entry.slug
  const story = {
    name: entry.name,
    slug: entry.slug,
    parent_id: parentId,
    ...(entry.startpage ? { is_startpage: true } : {}),
    ...(entry.definition === siteSettingsDefinition ? { disable_fe_editor: true } : {}),
    content: toBlok(entry.doc, entry.definition),
  }
  const existing = await findStory(fullSlug)
  const body = JSON.stringify({ story, publish: publish ? 1 : 0 })
  const saved = existing
    ? (await call<{ story: Story }>(`/stories/${existing.id}`, { method: "PUT", body })).story
    : (await call<{ story: Story }>("/stories", { method: "POST", body })).story
  if (entry.path) storiesByPath.set(entry.path, { uuid: saved.uuid, fullSlug: saved.full_slug })
  uuidsById.set(entry.doc.id as string, saved.uuid)
  return saved
}

await uploadAll(demoContent)
console.log(`${assets.size} assets ready`)

// Pass 1 creates every story (categories first, for references); pass 2 saves
// again with internal links pointing at the stories they now resolve to.
const all = entries()
for (const entry of all) await save(entry, false)
for (const entry of all) {
  const saved = await save(entry, true)
  console.log(`published ${saved.full_slug}`)
}
console.log(`\n${all.length} stories in space ${spaceId}.`)
