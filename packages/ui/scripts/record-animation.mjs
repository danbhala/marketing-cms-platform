import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "playwright"

// Usage: node scripts/record-animation.mjs <docsBaseUrl> <outDir> [stills|<pace>]
// Drives the docs Animation page's live demo the way a person would (visible
// cursor, pauses) and records a 1440x900 webm: presets, stagger, timing, a
// different block, then the finished page. With "stills" it saves PNGs instead.
const [base, outDir, mode] = process.argv.slice(2)
const stills = mode === "stills"
const PACE = stills ? 1 : Number(mode ?? 1) || 1
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: stills ? undefined : { dir: outDir, size: { width: 1440, height: 900 } },
})
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
const still = async (name) => { if (stills) await page.screenshot({ path: join(outDir, `animation-${String(++shot).padStart(2, "0")}-${name}.png`) }) }

const rand = (a, b) => a + Math.random() * (b - a)
const pause = (ms = 700) => page.waitForTimeout(stills ? 150 : ms * PACE * rand(0.85, 1.25))
async function moveTo(x, y, ms = 500) {
  await page.mouse.move(x, y, { steps: Math.max(8, Math.round(ms / 16)) })
}
async function click(locator, settle = 700) {
  await locator.scrollIntoViewIfNeeded()
  const b = await locator.boundingBox()
  await moveTo(b.x + b.width / 2 + rand(-b.width * 0.2, b.width * 0.2), b.y + b.height / 2 + rand(-2, 2), rand(350, 650))
  await pause(180)
  await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up()
  await pause(settle)
}

const demo = page.locator("[data-docs-preview]").first()
const option = (name) => demo.getByRole("button", { name, exact: true })
const replay = demo.getByRole("button", { name: "Replay" })

// 1. Open the Animation page; the demo plays "Fade up, staggered" on load.
await page.goto(new URL("/docs/animation", base).href, { waitUntil: "load" })
await demo.waitFor()
await demo.scrollIntoViewIfNeeded()
await pause(2200)
await still("fade-up-staggered")

// 2. Each preset on the feature grid.
for (const [label, name] of [["Scale in", "scale-in"], ["Slide from left", "slide-from-left"], ["Blur in", "blur-in"], ["Fade in", "fade-in"]]) {
  await click(option(label), 1600)
  await still(name)
}

// 3. Stagger off: the whole block moves as one. Then back on.
await click(option("Fade up"), 1400)
await click(demo.getByText("animationStagger"), 1600)
await still("stagger-off")
await click(demo.getByText("animationStagger"), 1200)

// 4. Timing: slow with a medium delay, then replay.
await click(option("slow"), 1800)
await click(option("medium"), 1800)
await still("slow-medium")
await click(replay, 2200)
await click(option("normal"), 600)
await click(option("none").last(), 600)

// 5. Other blocks: hero, pricing, call to action.
for (const [value, name, preset] of [["hero", "hero", "Fade up"], ["pricing", "pricing", "Scale in"], ["cta", "cta", "Blur in"]]) {
  await click(demo.getByRole("combobox"), 300)
  await demo.getByRole("combobox").selectOption(value)
  await demo.getByRole("combobox").evaluate((el) => el.blur())
  await pause(900)
  await click(option(preset), 1800)
  await still(name)
}

// 6. Off: the demo block is static again.
await click(option("Off"), 1400)
await still("off")

// 7. Read on: fields table and how it works.
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 180); await page.waitForTimeout(stills ? 2 : 120) }
await pause(1600)
await still("fields")

await page.waitForTimeout(stills ? 0 : 800)
await context.close()
await browser.close()
