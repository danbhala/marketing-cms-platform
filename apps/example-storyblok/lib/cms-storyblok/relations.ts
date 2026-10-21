import { article, page } from "@/lib/content-model"

import { relationsFor } from "./transform"

/** `component.field` pairs Storyblok expands inline for pages and articles. */
export const pageRelations = relationsFor(page)
const articleRelations = relationsFor(article)
export const documentRelations = [...new Set([...pageRelations, ...articleRelations])]
