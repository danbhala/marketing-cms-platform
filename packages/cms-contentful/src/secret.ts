import { timingSafeEqual } from "node:crypto"

/** Constant-time comparison so a secret cannot be guessed byte by byte. An empty expected value never matches. */
export function secretMatches(provided: string | null | undefined, expected: string): boolean {
  if (!expected || typeof provided !== "string") return false
  const a = Buffer.from(provided, "utf8")
  const b = Buffer.from(expected, "utf8")
  return a.length === b.length && timingSafeEqual(a, b)
}
