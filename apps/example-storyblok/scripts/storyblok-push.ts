/**
 * Creates or updates the space's components from lib/content-model, so the
 * Storyblok editor offers exactly the blocks and fields this site renders.
 * Components are filed into Block Library folders, and the site settings
 * story is created if missing with the Visual Editor turned off (it has no
 * page to preview). Run it again after adding or changing a block:
 * `npm run cms:push`.
 *
 * Needs STORYBLOK_SPACE_ID and STORYBLOK_MANAGEMENT_TOKEN (a personal access
 * token) in the environment or .env.local. Pass --dry-run to only print.
 */
import { componentGroups, generateComponents } from "../lib/cms-storyblok/schema"

const managementHosts: Record<string, string> = {
  eu: "https://mapi.storyblok.com",
  us: "https://api-us.storyblok.com",
  ca: "https://api-ca.storyblok.com",
  ap: "https://api-ap.storyblok.com",
  cn: "https://app.storyblokchina.cn",
}

try {
  process.loadEnvFile(".env.local")
} catch {
  // no .env.local; use the environment as is
}

const spaceId = process.env.STORYBLOK_SPACE_ID
const token = process.env.STORYBLOK_MANAGEMENT_TOKEN
const host = managementHosts[process.env.STORYBLOK_REGION ?? "eu"]
const dryRun = process.argv.includes("--dry-run")
const { components } = generateComponents()

if (dryRun) {
  console.log(JSON.stringify(components.map((c) => c.name)))
  process.exit(0)
}
if (!spaceId || !token || !host) {
  console.error("Set STORYBLOK_SPACE_ID, STORYBLOK_MANAGEMENT_TOKEN and a valid STORYBLOK_REGION.")
  process.exit(1)
}

const base = `${host}/v1/spaces/${spaceId}/components`
const headers = { Authorization: token, "Content-Type": "application/json" }
const wait = () => new Promise((resolve) => setTimeout(resolve, 350)) // stay under the rate limit

async function call(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers })
  if (!response.ok) throw new Error(`${init?.method ?? "GET"} ${url}: ${response.status} ${await response.text()}`)
  return response.json()
}

// Block Library folders, created on first push.
const groupsBase = `${host}/v1/spaces/${spaceId}/component_groups`
const groups = new Map<string, string>(
  ((await call(groupsBase)) as { component_groups: { uuid: string; name: string }[] }).component_groups.map((g) => [
    g.name,
    g.uuid,
  ])
)
const groupOf = new Map<string, string>()
for (const [name, members] of Object.entries(componentGroups())) {
  if (!groups.has(name)) {
    const created = (await call(groupsBase, {
      method: "POST",
      body: JSON.stringify({ component_group: { name } }),
    })) as {
      component_group: { uuid: string }
    }
    groups.set(name, created.component_group.uuid)
    console.log(`created folder ${name}`)
    await wait()
  }
  for (const member of members) groupOf.set(member, groups.get(name)!)
}

const existing = new Map<string, number>(
  ((await call(base)) as { components: { id: number; name: string }[] }).components.map((c) => [c.name, c.id])
)

for (const component of components) {
  const id = existing.get(component.name)
  const body = { component: { ...component, component_group_uuid: groupOf.get(component.name) ?? null } }
  await call(id ? `${base}/${id}` : base, { method: id ? "PUT" : "POST", body: JSON.stringify(body) })
  console.log(`${id ? "updated" : "created"} ${component.name}`)
  await wait()
}
console.log(`\n${components.length} components in space ${spaceId}.`)

// Site settings is a single story the layout reads (the adapter's default slug).
// It has no page of its own, so editors get the form editor instead of a blank preview.
const stories = `${host}/v1/spaces/${spaceId}/stories`
const settingsSlug = "site-settings"
type Story = { id: number; disable_fe_editor?: boolean }
const [found] = ((await call(`${stories}?with_slug=${settingsSlug}`)) as { stories: Story[] }).stories
if (!found) {
  const story = {
    name: "Site settings",
    slug: settingsSlug,
    disable_fe_editor: true,
    content: { component: "siteSettings", siteName: "My site" },
  }
  await call(stories, { method: "POST", body: JSON.stringify({ story }) })
  console.log(`created the ${settingsSlug} story (unpublished): fill it in and publish`)
} else if (!found.disable_fe_editor) {
  // A partial update keeps the content; only this setting changes.
  await call(`${stories}/${found.id}`, { method: "PUT", body: JSON.stringify({ story: { disable_fe_editor: true } }) })
  console.log(`turned off the Visual Editor for ${settingsSlug}`)
}
