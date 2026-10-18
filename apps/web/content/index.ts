import type { Article, Category, Page, SiteSettings } from "@platform/content-model"

import { destinationPages, destinationsPage } from "./destinations"
import { articles, categories, newsPage } from "./news"
import { aboutPage, contactPage, helpPage, homePage, homesPage, ownersPage } from "./pages"
import { settings } from "./site"

/**
 * Harbor & Co, the demo site's content: a fictional coastal holiday-home
 * company written in the canonical content shape, served by the local
 * adapter. Connect a real CMS by setting CMS_PROVIDER and this file is
 * unused; the shape of every page is the same.
 */
export const demoContent: { pages: Page[]; articles: Article[]; categories: Category[]; settings: SiteSettings } = {
  pages: [
    homePage,
    homesPage,
    destinationsPage,
    ...destinationPages,
    ownersPage,
    aboutPage,
    helpPage,
    contactPage,
    newsPage,
  ],
  articles,
  categories,
  settings,
}
