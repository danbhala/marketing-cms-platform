/**
 * Creates or updates the space's components from lib/content-model, so the
 * Storyblok editor offers exactly the blocks and fields this site renders.
 * Run it again after adding or changing a block: `npm run cms:push`.
 *
 * Needs STORYBLOK_SPACE_ID and STORYBLOK_MANAGEMENT_TOKEN (a personal access
 * token) in the environment or .env.local. Pass --dry-run to only print.
 */
import { generateComponents } from "../lib/cms-storyblok/schema"

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

const existing = new Map<string, number>(
  ((await call(base)) as { components: { id: number; name: string }[] }).components.map((c) => [c.name, c.id])
)

for (const component of components) {
  const id = existing.get(component.name)
  await call(id ? `${base}/${id}` : base, { method: id ? "PUT" : "POST", body: JSON.stringify({ component }) })
  console.log(`${id ? "updated" : "created"} ${component.name}`)
  await wait()
}
console.log(`\n${components.length} components in space ${spaceId}.`)
