// Vendors shadcn/ui "base-nova" components from a local checkout of shadcn-ui/ui,
// using the same transform functions the official registry build uses
// (shadcn/utils: createStyleMap + transformStyle), because ui.shadcn.com is
// not reachable from this environment.
import fs from "node:fs/promises"
import path from "node:path"
import { createStyleMap, transformStyle } from "shadcn/utils"

const [src, out, ...names] = process.argv.slice(2)
const base = path.join(src, "apps/v4/registry/bases/base")
const styleMap = createStyleMap(await fs.readFile(path.join(src, "apps/v4/registry/styles/style-nova.css"), "utf8"))

const ATTRS = ["tabler", "hugeicons", "phosphor", "remixicon"]
function transformIcons(code) {
  const icons = new Set()
  code = code.replace(/<IconPlaceholder([\s\S]*?)\/>/g, (_, attrs) => {
    const m = attrs.match(/lucide="([A-Za-z0-9]+)"/)
    if (!m) throw new Error("icon without lucide name")
    icons.add(m[1])
    let rest = attrs.replace(/\s*lucide="[^"]*"/, "")
    for (const a of ATTRS) rest = rest.replace(new RegExp(`\\s*${a}="[^"]*"`), "")
    return `<${m[1]}${rest}/>`
  })
  code = code.replace(/import \{ IconPlaceholder \} from "[^"]+"\n/, icons.size ? `import { ${[...icons].sort().join(", ")} } from "lucide-react"\n` : "")
  return code
}

for (const name of names) {
  let code = await fs.readFile(path.join(base, "ui", `${name}.tsx`), "utf8")
  code = await transformStyle(code, { styleMap })
  code = transformIcons(code)
  code = code
    .replace(/from "cn"/g, 'from "../lib/utils"')
    .replace(/from "@\/registry\/bases\/base\/ui\/([a-z-]+)"/g, 'from "./$1"')
    .replace(/from "@\/registry\/bases\/base\/hooks\/([a-z-]+)"/g, 'from "../hooks/$1"')
    .replace(/from "@\/registry\/bases\/base\/lib\/([a-z-]+)"/g, 'from "../lib/$1"')
  if (/@\/(registry|app)\//.test(code)) console.warn(`unresolved import in ${name}`)
  await fs.writeFile(path.join(out, `${name}.tsx`), code)
  console.log("vendored", name)
}
