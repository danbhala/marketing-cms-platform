import type { AnyDefinition, AnyDocumentDefinition } from "@platform/content-model"
import { allDocuments, article, listableDocuments } from "@platform/content-model"

/** Views of the content model shared by the queries, the schema generator and the webhook. */

export const routableDocuments: readonly AnyDocumentDefinition[] = allDocuments.filter((d) => d.routable)
export const taxonomyDocuments: readonly AnyDocumentDefinition[] = allDocuments.filter((d) => d.taxonomy)
/** Document types a collection block can list. */
export const listedTypes: readonly string[] = Object.values(listableDocuments).map((d) => d.type)

/** Fields the schema stores as a Sanity `slug`: a routable document's `path` and a taxonomy term's `slug`. */
export const isSlugField = (definition: AnyDefinition, name: string) =>
  (definition.routable === true && name === "path") || (definition.taxonomy === true && name === "slug")

/** The listing item: the article without its body and blocks. Validated with the same definition it is queried with. */
const summaryKeys = ["title", "path", "publishedAt", "excerpt", "image", "category", "tags"]
export const articleSummary: AnyDocumentDefinition = {
  ...article,
  fields: Object.fromEntries(Object.entries(article.fields).filter(([name]) => summaryKeys.includes(name))),
}
