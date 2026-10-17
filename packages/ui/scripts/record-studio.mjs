import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "playwright"

// Usage: node scripts/record-studio.mjs <baseUrl> <outDir> [stills]
// Drives the theme studio the way a person would (visible cursor, pauses,
// slider drags, scrolling) and records a 1440x900 webm. With "stills" it
// skips the video and saves a PNG at each step instead.
const [base, outDir, mode] = process.argv.slice(2)
const stills = mode === "stills"
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: stills ? undefined : { dir: outDir, size: { width: 1440, height: 900 } },
})
// A drawn cursor: recordings don't include the real pointer.
await context.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const c = document.createElement("div")
    c.id = "__cursor"
    c.style.cssText = `position:fixed;left:0;top:0;width:18px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(-2px,-2px);
      background:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 26"><path d="M1 1 L1 20 L6 15.5 L9.5 24 L12.5 22.7 L9 14.5 L16 14.5 Z" fill="black" stroke="white" stroke-width="1.4"/></svg>') no-repeat;
      transition:transform .08s;`
    document.body.appendChild(c)
    addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px" }, true)
    addEventListener("mousedown", () => { c.style.transform = "translate(-2px,-2px) scale(.85)" }, true)
    addEventListener("mouseup", () => { c.style.transform = "translate(-2px,-2px)" }, true)
  })
})
const page = await context.newPage()
let shot = 0
const still = async (name) => { if (stills) await page.screenshot({ path: join(outDir, `flow-${String(++shot).padStart(2, "0")}-${name}.png`) }) }

const rand = (a, b) => a + Math.random() * (b - a)
const PACE = Number(process.env.PACE ?? 1)
const pause = (ms = 700) => page.waitForTimeout(stills ? 150 : ms * PACE * rand(0.85, 1.25))
let cur = { x: 700, y: 450 }
async function moveTo(x, y, ms = 500) {
  const steps = Math.max(8, Math.round(ms / 16))
  await page.mouse.move(x, y, { steps })
  cur = { x, y }
}
async function centre(locator) {
  await locator.scrollIntoViewIfNeeded()
  const b = await locator.boundingBox()
  return { x: b.x + b.width / 2 + rand(-b.width * 0.2, b.width * 0.2), y: b.y + b.height / 2 + rand(-2, 2), box: b }
}
async function click(locator, settle = 700) {
  const { x, y } = await centre(locator)
  await moveTo(x, y, rand(350, 650))
  await pause(180)
  await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up()
  await pause(settle)
}
async function drag(locator, fromFrac, toFrac, ms = 1100) {
  const { box } = await centre(locator)
  const y = box.y + box.height / 2
  const x0 = box.x + 8 + (box.width - 16) * fromFrac, x1 = box.x + 8 + (box.width - 16) * toFrac
  await moveTo(x0, y, 450); await pause(150)
  await page.mouse.down()
  const steps = Math.round(ms / 25)
  for (let i = 1; i <= steps; i++) { const t = i / steps, e = t * t * (3 - 2 * t); await page.mouse.move(x0 + (x1 - x0) * e, y + rand(-1, 1)); await page.waitForTimeout(stills ? 2 : 25) }
  await page.mouse.up()
  await pause(500)
}
async function select(locator, value) {
  await click(locator, 450)
  await locator.selectOption(value)
  await locator.evaluate((el) => el.blur())
  await pause(900)
}
async function wheel(dy, ms = 900) {
  const n = Math.round(ms / 40)
  for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy / n); await page.waitForTimeout(stills ? 2 : 40) }
}

// 1. Arrive on the docs home, read, then open the studio from the nav.
await page.goto(new URL("/", base).href, { waitUntil: "load" })
await moveTo(700, 500, 400)
await pause(1600)
await still("home")
await click(page.getByRole("link", { name: "Theme studio" }).first(), 0)
await page.waitForURL("**/theme**")
await page.waitForTimeout(stills ? 800 : 1800)
await moveTo(880, 480, 700)
await pause(1200)
await still("studio-verso")

// 2. Try a couple of presets.
const presetSelect = page.locator("header select").first()
await select(presetSelect, "kessler")
await still("preset-kessler")
await select(presetSelect, "lumen")
await still("preset-lumen")

// 3. Colours: generate a palette, then nudge the primary.
await drag(page.locator(".hue-range").first(), 0.45, 0.78)
await click(page.getByRole("button", { name: "Dark" }).first(), 500)
await click(page.getByRole("button", { name: "Apply" }))
await pause(900)
await still("palette-dark")
await click(page.getByRole("button", { name: "Light" }).first(), 500)
await click(page.getByRole("button", { name: "Apply" }))
await pause(900)
await still("palette-light")
const primary = page.locator("details:has(summary:has-text('Primary'))").first()
await click(primary.locator("summary"), 600)
await drag(primary.locator("input[type=range]").first(), 0.3, 0.5, 900)
await pause(600)
await still("primary-adjusted")

// 4. Type: fonts and heading treatment.
await click(page.getByRole("button", { name: "type" }), 800)
const sidebarSelects = page.locator("aside select")
await select(sidebarSelects.nth(0), "fraunces")
await still("font-heading")
await select(sidebarSelects.nth(1), "inter")
const weight = page.locator("aside input[type=range]").nth(0)
await drag(weight, 0.5, 0.85, 900)
await click(page.getByLabel("Uppercase headings"), 900)
await still("type-treatment")
await click(page.getByLabel("Uppercase headings"), 600)

// 5. Layout: radius and rhythm.
await click(page.getByRole("button", { name: "layout" }), 800)
const layoutRanges = page.locator("aside input[type=range]")
await drag(layoutRanges.nth(0), 0.4, 0.75, 1000)
await drag(layoutRanges.nth(1), 0.5, 0.25, 900)
await still("layout")

// 6. Check it on a phone, then back.
await click(page.getByRole("button", { name: "Mobile" }), 1200)
await moveTo(880, 520, 500)
await wheel(900, 1400)
await pause(500)
await still("mobile")
await click(page.getByRole("button", { name: "Desktop" }), 900)

// 7. Surprise me, twice.
await click(page.getByRole("button", { name: "Surprise me" }), 1300)
await still("surprise-1")
await click(page.getByRole("button", { name: "Surprise me" }), 1300)
await still("surprise-2")

// 8. Export: read the CSS and copy it.
await click(page.getByRole("button", { name: "export" }), 900)
await moveTo(250, 500, 400)
await wheel(500, 900)
await pause(500)
await wheel(-500, 600)
await click(page.locator("aside").getByRole("button", { name: "Copy CSS" }), 1400)
await still("export")

// 9. Open the full page with this theme and scroll through it.
const href = await page.locator("a:has-text('Open full page')").getAttribute("href")
{ const { x, y } = await centre(page.locator("a:has-text('Open full page')")); await moveTo(x, y, 500); await pause(300) }
// The link opens a new tab; a popup would be recorded as a separate file, so follow it in this tab instead.
await page.goto(new URL(href, base).href, { waitUntil: "load" })
await page.waitForTimeout(stills ? 800 : 1500)
await moveTo(720, 600, 500)
await still("full-page-top")
for (let i = 0; i < 5; i++) { await wheel(700, 1100); await pause(700) }
await still("full-page-scrolled")
await pause(1800)

await context.close()
await browser.close()
console.log(stills ? `stills: ${shot}` : "video written to " + outDir)
