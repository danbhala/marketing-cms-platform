/** Every visible string in the listing UI, so hosts can localise them in one place. */
export interface ListingLabels {
  all: string
  search: string
  searchPlaceholder: string
  sort: string
  sorts: { newest: string; oldest: string; title: string }
  filters: string
  results: (count: number) => string
  searchResults: (count: number, q: string) => string
  empty: string
  clear: string
  pagination: string
  previous: string
  next: string
  page: (n: number) => string
  loading: string
}

export const defaultListingLabels: ListingLabels = {
  all: "All",
  search: "Search",
  searchPlaceholder: "Search stories",
  sort: "Sort by",
  sorts: { newest: "Newest first", oldest: "Oldest first", title: "Title A to Z" },
  filters: "Filter by category",
  results: (count) => (count === 1 ? "1 story" : `${count} stories`),
  searchResults: (count, q) => `${count === 1 ? "1 result" : `${count} results`} for “${q}”`,
  empty: "Nothing matches those filters yet.",
  clear: "Clear filters",
  pagination: "Pagination",
  previous: "Previous page",
  next: "Next page",
  page: (n) => `Page ${n}`,
  loading: "Loading stories",
}
