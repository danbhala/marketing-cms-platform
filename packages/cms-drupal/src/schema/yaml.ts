/**
 * Minimal YAML writer for Drupal configuration files. Drupal reads config with
 * Symfony YAML, whose output conventions this follows (`{  }` for an empty
 * map, `[  ]` for an empty list, single-quoted strings only when needed), so
 * a `drush config:export` of the installed module diffs cleanly against the
 * generated files. Only the value shapes config uses are supported: maps,
 * lists, strings, numbers, booleans and null.
 */
export type YamlValue = string | number | boolean | null | YamlValue[] | { [key: string]: YamlValue }

export function toYaml(value: YamlValue): string {
  return `${render(value, 0)}\n`
}

function render(value: YamlValue, indent: number): string {
  const pad = "  ".repeat(indent)
  if (Array.isArray(value)) {
    if (value.length === 0) return "[  ]"
    return value
      .map((item) => {
        if (isScalar(item)) return `${pad}- ${scalar(item)}`
        if (Array.isArray(item)) return `${pad}-\n${render(item, indent + 1)}`
        const body = render(item, indent + 1)
        // The first key of a mapping item sits on the dash line.
        return `${pad}- ${body.trimStart()}`
      })
      .join("\n")
  }
  if (isScalar(value)) return scalar(value)
  const entries = Object.entries(value)
  if (entries.length === 0) return "{  }"
  return entries
    .map(([key, item]) => {
      const k = scalar(key)
      if (isScalar(item)) return `${pad}${k}: ${scalar(item)}`
      if ((Array.isArray(item) && item.length === 0) || (!Array.isArray(item) && Object.keys(item).length === 0)) {
        return `${pad}${k}: ${render(item, 0)}`
      }
      return `${pad}${k}:\n${render(item, indent + 1)}`
    })
    .join("\n")
}

function isScalar(value: YamlValue): value is string | number | boolean | null {
  return value === null || typeof value !== "object"
}

const plain = /^[A-Za-z_][A-Za-z0-9_.\-/ ]*$/
const reserved = new Set(["true", "false", "null", "yes", "no", "on", "off", "~", "y", "n"])

function scalar(value: string | number | boolean | null): string {
  if (value === null) return "null"
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "number") return String(value)
  if (value === "") return "''"
  if (plain.test(value) && !reserved.has(value.toLowerCase()) && !/\s$/.test(value) && !/^\d/.test(value)) return value
  return `'${value.replace(/'/g, "''")}'`
}
