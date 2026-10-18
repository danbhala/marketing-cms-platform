/**
 * Splitting an authored number such as "2,400+", "$49", "99.99%" or "<60ms"
 * into the number that counts and the text around it, and formatting it back
 * with the browser's `Intl.NumberFormat` so a French site counts "2 400" and
 * an English one "2,400". This is the thin version of Motion+'s
 * `AnimateNumber`: a tween between two numbers, formatted per locale.
 */

export interface ParsedNumber {
  /** Text before the number ("$", "<"). */
  prefix: string
  /** The number itself. */
  value: number
  /** Decimal places the author wrote, kept while counting. */
  decimals: number
  /** Whether the author grouped thousands ("2,400"). */
  grouped: boolean
  /** Text after the number ("%", "+", "ms", "B"). */
  suffix: string
}

const NUMBER = /-?\d[\d,.\s ]*/

/** Find the first number in a string; `null` when there is none (then there is nothing to count). */
export function parseNumber(text: string): ParsedNumber | null {
  const match = NUMBER.exec(text)
  if (!match) return null
  const raw = match[0].replace(/[\s ]/g, "")
  // Grouping separators are any ',' or '.' followed by exactly three digits
  // that are not the last group with a decimal point after them.
  const normalised = raw.replace(/,/g, "")
  const value = Number(normalised)
  if (!Number.isFinite(value)) return null
  const decimals = normalised.includes(".") ? normalised.split(".")[1]!.length : 0
  return {
    prefix: text.slice(0, match.index),
    value,
    decimals,
    grouped: raw.includes(","),
    suffix: text.slice(match.index + match[0].length),
  }
}

/** Format `value` the way the author wrote the original: same decimals and grouping, in the given locale. */
export function formatNumber(value: number, parsed: ParsedNumber, locale?: string): string {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: parsed.decimals,
    maximumFractionDigits: parsed.decimals,
    useGrouping: parsed.grouped,
  }).format(value)
  return `${parsed.prefix}${formatted}${parsed.suffix}`
}
