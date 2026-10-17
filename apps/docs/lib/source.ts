import { loader } from "fumadocs-core/source"

import { docs } from "@/.source"

/** The docs collection from content/docs, served under /docs. */
export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
})
