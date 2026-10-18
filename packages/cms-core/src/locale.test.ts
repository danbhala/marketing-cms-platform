import { describe, expect, it } from "vitest"

import { localePath, localizeHref, type LocaleConfig } from "./locale"

const always: LocaleConfig = { locales: ["en", "fr"], defaultLocale: "en", localePrefix: "always" }
const asNeeded: LocaleConfig = { ...always, localePrefix: "as-needed" }

describe("localePath", () => {
  it("prefixes every locale with always", () => {
    expect(localePath(always, "en", "/")).toBe("/en")
    expect(localePath(always, "fr", "/about")).toBe("/fr/about")
  })
  it("leaves the default locale bare with as-needed", () => {
    expect(localePath(asNeeded, "en", "/about")).toBe("/about")
    expect(localePath(asNeeded, "fr", "/")).toBe("/fr")
  })
})

describe("localizeHref", () => {
  it("adds the current locale to internal links", () => {
    expect(localizeHref(always, "fr", "/about")).toBe("/fr/about")
    expect(localizeHref(always, "fr", "/news?page=2#top")).toBe("/fr/news?page=2#top")
    expect(localizeHref(asNeeded, "en", "/about")).toBe("/about")
  })
  it("leaves external, anchor and already-localised links alone", () => {
    expect(localizeHref(always, "fr", "https://example.com")).toBe("https://example.com")
    expect(localizeHref(always, "fr", "#faq")).toBe("#faq")
    expect(localizeHref(always, "fr", "//cdn.example.com/x")).toBe("//cdn.example.com/x")
    expect(localizeHref(always, "fr", "/en/about")).toBe("/en/about")
  })
})
