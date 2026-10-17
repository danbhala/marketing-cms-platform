/**
 * Where the docs link to Storybook. NEXT_PUBLIC_STORYBOOK_URL wins; otherwise
 * production builds serve it themselves at /storybook (scripts/copy-storybook.mjs)
 * and development points at `pnpm storybook` on port 6006.
 */
export function storybookUrl(): string {
  return (
    process.env.NEXT_PUBLIC_STORYBOOK_URL ??
    (process.env.NODE_ENV === "production"
      ? "/storybook"
      : "http://localhost:6006")
  )
}
