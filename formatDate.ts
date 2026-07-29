/**
 * Formats an ISO date string (YYYY-MM-DD, as stored on Post and
 * returned by Notion's date property) into the short display format
 * used across the grid, e.g. "2026-07-12" -> "Jul 12".
 *
 * Parses the date components manually rather than via `new Date(iso)`
 * to avoid a timezone off-by-one: a bare "YYYY-MM-DD" string is
 * parsed as UTC midnight by the Date constructor, which can render as
 * the previous day once formatted in a timezone behind UTC.
 */
export function formatDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);

  if (!year || !month || !day) return isoDate;

  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
