import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "playwright"

// Usage: node scripts/record-preview.mjs <webBaseUrl> <outDir> [stills|<pace>] [secret]
// Drives the web app on the local adapter the way an editor would: published
// page, enter Draft Mode in edit mode, hover and click fields to show the
// `$edit` overlay, scroll through the page, then exit. Records a 1440x900
// webm (convert to mp4 with ffmpeg); "stills" saves a PNG per step instead.
const [base, outDir, mode, secretArg] = process.argv.slice(2)
const stills = mode === "stills"
const PACE = stills ? 1 : Number(mode ?? 1) || 1
const secret = secretArg ?? process.env.PREVIEW_SECRET ?? "change-me"
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
const still = async (name) => { if (stills) await page.screenshot({ path: join(outDir, `preview-${String(++shot).padStart(2, "0")}-${name}.png`) }) }

const rand = (a, b) => a + Math.random() * (b - a)
const pause = (ms = 700) => page.waitForTimeout(stills ? 150 : ms * PACE * rand(0.85, 1.25))
async function moveTo(x, y, ms = 500) {
  await page.mouse.move(x, y, { steps: Math.max(8, Math.round(ms / 16)) })
}
async function centre(locator) {
  await locator.scrollIntoViewIfNeeded()
  const b = await locator.boundingBox()
  return { x: b.x + Math.min(b.width * 0.35, 220), y: b.y + b.height / 2, box: b }
}
// Hover a field long enough for the overlay label to be read.
async function hover(locator, dwell = 1300) {
  const { x, y } = await centre(locator)
  await moveTo(x, y, rand(450, 750))
  await pause(dwell)
}
async function click(locator, settle = 700) {
  const { x, y } = await centre(locator)
  await moveTo(x, y, rand(350, 650))
  await pause(180)
  await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up()
  await pause(settle)
}
async function wheel(dy, ms = 900) {
  const n = Math.round(ms / 40)
  for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy / n); await page.waitForTimeout(stills ? 2 : 40) }
}
const field = (id, name) => page.locator(`[data-edit-id="${id}"][data-edit-field="${name}"]`).first()
const block = (id) => page.locator(`[data-edit-id="${id}"][data-edit-type]`).first()

// 1. The published home page: no draft badge, no edit attributes.
await page.goto(new URL("/en", base).href, { waitUntil: "load" })
await moveTo(720, 420, 400)
await pause(1800)
await still("published")

// 2. The CMS opens the preview URL; the adapter validates it, Draft Mode turns on
//    and the app redirects to the page with the editor's query string kept.
await page.goto(new URL(`/api/preview?secret=${encodeURIComponent(secret)}&path=/&mode=edit`, base).href, { waitUntil: "load" })
await page.waitForURL("**/en?mode=edit")
await page.getByRole("status").getByText("Draft mode").waitFor()
await page.waitForTimeout(stills ? 500 : 1200)
await moveTo(700, 500, 500)
await pause(1200)
await still("draft-mode")

// 3. Hover the hero fields: the overlay names the entry id and field.
await hover(field("blk-hero", "eyebrow"), 1200)
await hover(field("blk-hero", "title"), 1600)
await hover(field("blk-hero", "description"), 1400)
await still("hover-hero-title")
await click(field("blk-hero", "title"), 900)
await still("click-hero-title")
await hover(block("act-1"), 1200)

// 4. Scroll to the feature grid and hover a block root, then its items.
await wheel(760, 1200)
await pause(600)
await hover(block("blk-features"), 1300)
for (const id of ["feat-1", "feat-2"]) {
  await hover(field(id, "title"), 1100)
  await hover(field(id, "description"), 1100)
}
await still("hover-features")

// 5. Further down: the CTA and FAQ.
await wheel(900, 1300)
await pause(500)
const faq = page.locator('[data-edit-field="question"]').first()
if (await faq.count()) { await hover(faq, 1200); await click(faq, 700) }
await wheel(700, 1100)
await pause(500)
await hover(field("blk-cta", "title"), 1400)
await hover(field("blk-cta", "description"), 1200)
await still("hover-cta")

// 6. Exit Draft Mode from the badge; the page comes back published.
await click(page.getByRole("status").getByRole("link", { name: "Exit" }), 0)
await page.waitForURL("**/en")
await page.waitForTimeout(stills ? 600 : 1500)
await moveTo(720, 460, 500)
await pause(2000)
await still("exited")

await context.close()
await browser.close()
console.log(stills ? `stills: ${shot}` : "video written to " + outDir)
