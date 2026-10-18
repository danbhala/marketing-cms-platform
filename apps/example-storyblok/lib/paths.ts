/** `/a/b` <-> `["a","b"]` for the optional catch-all segment. */
export function slugToPath(slug: string[] | undefined): string {
  return `/${(slug ?? []).join("/")}`
}

export function pathToSlug(path: string): string[] {
  return path.split("/").filter(Boolean)
}
