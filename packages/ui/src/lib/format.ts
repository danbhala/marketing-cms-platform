/**
 * Formats an ISO 8601 date from the content model ("2026-10-18" or a full
 * date-time) for display. Date-only values are read as UTC so they never
 * shift a day in the viewer's time zone.
 */
export function formatDate(
  iso: string,
  locale = "en",
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }
): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso)
  const date = new Date(dateOnly ? `${iso}T00:00:00Z` : iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(locale, { ...options, ...(dateOnly ? { timeZone: "UTC" } : {}) }).format(date)
}
