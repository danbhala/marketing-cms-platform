#!/usr/bin/env node
/**
 * End-to-end check of the scaffolder: builds the registry, serves it on
 * localhost, runs create-marketing-cms-app into a temp directory, then
 * checks every file landed unchanged, that the site lints and compiles, and
 * that apps/example-storyblok is exactly what the CLI produces.
 *
 *   node packages/registry/smoke.mjs [--keep] [--update-example]
 *
 * --update-example rewrites apps/example-storyblok from the fresh scaffold
 * (run it after changing the CLI, the registry or any copied source).
 */
import { execFileSync, spawn } from "node:child_process"
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const example = join(here, "../../apps/example-storyblok")
const work = mkdtempSync(join(tmpdir(), "marketing-cms-smoke-"))
const registryDir = join(work, "r")
const site = join(work, "example-storyblok")
const keep = process.argv.includes("--keep")
const updateExample = process.argv.includes("--update-example")

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: "inherit" })

run("node", [join(here, "build.mjs"), registryDir])

const server = createServer((req, res) => {
  try {
    res.setHeader("Content-Type", "application/json")
    res.end(readFileSync(join(registryDir, new URL(req.url, "http://x").pathname)))
  } catch {
    res.statusCode = 404
    res.end()
  }
})
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
const registry = `http://127.0.0.1:${server.address().port}`

/** What the example commits: the scaffold minus installs, builds, secrets and npm's lockfile (pnpm locks it here). */
const skip = new Set(["node_modules", ".next", ".turbo", ".git", ".env.local", "package-lock.json", "next-env.d.ts"])
const ignored = (name) => skip.has(name) || name.endsWith(".tsbuildinfo")
function files(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)))
    .filter((path) => !path.split("/").some(ignored))
    .sort()
}

/**
 * npm writes the newest matching version into package.json at install time,
 * so dependency versions drift with every release; compare package names only.
 */
function comparable(file, path) {
  const content = readFileSync(file, "utf8")
  if (path !== "package.json") return content
  const pkg = JSON.parse(content)
  for (const key of ["dependencies", "devDependencies"])
    if (pkg[key]) pkg[key] = Object.fromEntries(Object.keys(pkg[key]).map((name) => [name, "*"]))
  return JSON.stringify(pkg)
}

try {
  // Async spawn: the server answers on this process's event loop.
  await new Promise((resolve, reject) => {
    const child = spawn(
      "node",
      [join(here, "../create-marketing-cms-app/index.mjs"), site, "--storyblok", "--languages", "en-GB", "--registry", registry, "--yes"],
      { stdio: "inherit" }
    )
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`CLI exited with ${code}`))))
  })

  // shadcn rewrites `@/` imports it can match by file name; any rewrite would
  // break the site silently, so every file must land byte for byte.
  const item = JSON.parse(readFileSync(join(registryDir, "site-storyblok.json"), "utf8"))
  // cms.config.ts is the one installed file the CLI edits (the languages).
  const cmsConfig = readFileSync(join(site, "cms.config.ts"), "utf8")
  if (!cmsConfig.includes('locales: ["en-GB"],') || !cmsConfig.includes('localePrefix: "as-needed"')) throw new Error("cms.config.ts did not get the languages")
  const changed = item.files.filter((file) => {
    if (file.target === "cms.config.ts") return false
    const landed = readFileSync(join(site, file.target), "utf8")
    return landed.replaceAll('/index"', '"') !== file.content.replaceAll('/index"', '"')
  })
  if (changed.length) throw new Error(`Files changed on install: ${changed.map((f) => f.target).join(", ")}`)
  console.log(`\n✓ ${item.files.length} files installed unchanged`)

  // The example points at the published registry, not this run's localhost one.
  const cli = readFileSync(join(here, "../create-marketing-cms-app/index.mjs"), "utf8")
  const published = /DEFAULT_REGISTRY = "([^"]+)"/.exec(cli)[1]
  const config = join(site, "components.json")
  writeFileSync(config, readFileSync(config, "utf8").replace(registry, published))

  if (updateExample) {
    rmSync(example, { recursive: true, force: true })
    for (const path of files(site)) cpSync(join(site, path), join(example, path))
    console.log(`\n✓ Wrote apps/example-storyblok; run pnpm install to update the lockfile`)
  } else {
    const fresh = files(site)
    const committed = files(example)
    const drift = [
      ...fresh.filter((path) => !committed.includes(path)).map((path) => `missing ${path}`),
      ...committed.filter((path) => !fresh.includes(path)).map((path) => `extra ${path}`),
      ...fresh
        .filter((path) => committed.includes(path))
        .filter((path) => comparable(join(site, path), path) !== comparable(join(example, path), path))
        .map((path) => `changed ${path}`),
    ]
    if (drift.length)
      throw new Error(
        `apps/example-storyblok is not what the CLI produces (run node packages/registry/smoke.mjs --update-example):\n  ${drift.join("\n  ")}`
      )
    console.log(`✓ apps/example-storyblok matches the CLI output (${fresh.length} files)`)
  }

  run("npx", ["eslint", "."], site)
  run("npx", ["next", "typegen"], site)
  run("npx", ["tsc", "--noEmit"], site)
  run("npx", ["next", "build", "--experimental-build-mode", "compile"], site)
  run("npm", ["run", "cms:push", "--", "--dry-run"], site)
  console.log("\n✓ Scaffolded site lints and compiles")
} finally {
  server.close()
  if (keep) console.log(`Kept ${site}`)
  else rmSync(work, { recursive: true, force: true })
}
