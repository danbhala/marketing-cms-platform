import { describe, expect, it } from "vitest"

import { revealVariants } from "./presets"
import { splitWords } from "./split-text"
import { scrambleTiming, textVariants } from "./text-presets"

describe("revealVariants", () => {
  it("animates the root when not staggered and only times children when staggered", () => {
    const whole = revealVariants({ preset: "fadeUp", stagger: false, duration: "normal", delay: "short" })
    expect(whole.item).toBeNull()
    expect(whole.root.hidden).toEqual({ opacity: 0, y: 24 })
    const staggered = revealVariants({ preset: "fadeUp", stagger: true, duration: "normal", delay: "none" })
    expect(staggered.root.hidden).toEqual({})
    expect(staggered.item).not.toBeNull()
  })
})

describe("textVariants", () => {
  it("splits words, characters and typewriter as expected", () => {
    expect(textVariants({ preset: "words", duration: "normal", delay: "none" }).unit).toBe("word")
    expect(textVariants({ preset: "characters", duration: "normal", delay: "none" }).unit).toBe("char")
    const typed = textVariants({ preset: "typewriter", duration: "normal", delay: "none" }, { pieces: 10 })
    expect(typed.caret).toBe(true)
    expect(typed.total).toBeCloseTo(9 * 0.036, 3)
  })

  it("times lines by their index and leaves the delay to the block when inherited", () => {
    const lines = textVariants({ preset: "lines", duration: "normal", delay: "long" }, { lines: 3 })
    expect(lines.byLine).toBe(true)
    expect(lines.mask).toBe(true)
    const visible = lines.item.visible as (line: number) => { transition: { delay: number } }
    expect(visible(2).transition.delay).toBeCloseTo(2 * 0.108, 3)
    expect(lines.total).toBeCloseTo(0.6 + 2 * 0.108 + 0.6, 3)
    const inherited = textVariants({ preset: "lines", duration: "normal", delay: "long" }, { lines: 3, inheritDelay: true })
    expect(inherited.total).toBeCloseTo(2 * 0.108 + 0.6, 3)
  })

  it("rejects scramble, which has its own timing", () => {
    expect(() => textVariants({ preset: "scramble", duration: "normal", delay: "none" })).toThrow()
    expect(scrambleTiming({ preset: "scramble", duration: "slow", delay: "short" })).toMatchObject({ startDelay: 0.15, settle: 0.9 * 1.6 })
  })
})

describe("splitWords", () => {
  it("drops extra whitespace", () => {
    expect(splitWords("  Understand  what\nyour users do ")).toEqual(["Understand", "what", "your", "users", "do"])
  })
})
