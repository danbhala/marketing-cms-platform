import { loader, llms } from "fumadocs-core/source"

import { docs } from "@/.source"

/** The docs collection from content/docs, served under /docs. */
export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
})

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText("processed")}`,
})
