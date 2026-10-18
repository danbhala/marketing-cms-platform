#!/usr/bin/env node
/**
 * End-to-end check of the scaffolder: builds the registry, serves it on
 * localhost, runs create-marketing-cms-app into a temp directory, then
 * checks every file landed unchanged and that the site lints and compiles.
 *
 *   node packages/registry/smoke.mjs [--keep]
 */
import { execFileSync, spawn } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const work = mkdtempSync(join(tmpdir(), "marketing-cms-smoke-"))
const registryDir = join(work, "r")
const site = join(work, "my-site")
const keep = process.argv.includes("--keep")

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
