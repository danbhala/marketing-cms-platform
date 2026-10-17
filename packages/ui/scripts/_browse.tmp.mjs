import { chromium } from "playwright"
const base = process.argv[2]
const out = process.argv[3]
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const problems = []
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(`console.${m.type()}: ${m.text().slice(0, 300)}`) })
page.on("response", (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`) })
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message.slice(0, 300)}`))

const targets = [
  ["00-home", `${base}/storybook`],
  ["01-intro", `${base}/storybook/?path=/docs/docs-introduction--docs`],
  ["02-component-model", `${base}/storybook/?path=/docs/docs-component-model--docs`],
  ["03-theming", `${base}/storybook/?path=/docs/docs-theming--docs`],
  ["04-button-docs", `${base}/storybook/?path=/docs/atoms-button--docs`],
  ["05-hero-story", `${base}/storybook/?path=/story/blocks-hero--split`],
  ["06-hero-dark", `${base}/storybook/?path=/story/blocks-hero--split&globals=theme:dark`],
  ["07-landing", `${base}/storybook/?path=/story/templates-pages--landing`],
]
for (const [name, url] of targets) {
  const before = problems.length
  await page.goto(url, { waitUntil: "networkidle" })
  await page.waitForTimeout(2500)
  // the preview iframe
  const frame = page.frames().find((f) => f.url().includes("iframe.html"))
  let inner = "no preview iframe"
  if (frame) {
    try { await frame.waitForSelector("#storybook-root > *, #storybook-docs > *", { timeout: 15000 }); inner = (await frame.locator("body").innerText()).slice(0, 400).replace(/\s+/g, " ") } catch (e) { inner = "preview not rendered: " + e.message.slice(0, 100) }
  }
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false })
  console.log(`\n## ${name}  ${page.url()}\n   title: ${await page.title()}\n   preview: ${inner}\n   new problems: ${problems.length - before}`)
}
console.log("\n## all problems"); for (const p of [...new Set(problems)]) console.log(" -", p)
await browser.close()
