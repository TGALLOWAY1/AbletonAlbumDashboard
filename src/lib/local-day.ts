/**
 * Formatting a calendar day, in UTC or in the reader's own zone, from the same
 * function.
 *
 * WHY BOTH
 * --------
 * A stored timestamp is an instant; "which day was that" is a question only
 * the browser can answer, because only it knows the reader's zone. But a
 * server component (and the first render of a client one) has to produce
 * *something*, and on Vercel that something is UTC. Rendering the UTC answer
 * and then the local one is fine — they agree for most of the day and the swap
 * is one paint — as long as both renders start from the same text, which is
 * what `utc: true` is for. See `LocalDate`.
 */

export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export type DayFormatOptions = {
  /** Read the date with the UTC getters instead of the local ones. */
  utc?: boolean;
  /** "13 Sep 2026" rather than "13 Sep". */
  withYear?: boolean;
};

/** "13 Sep" — or "13 Sep 2026". Empty string for an unparseable date. */
export function formatDayMonth(
  date: Date,
  { utc = false, withYear = false }: DayFormatOptions = {},
): string {
  if (Number.isNaN(date.getTime())) return "";
  const day = utc ? date.getUTCDate() : date.getDate();
  const month = utc ? date.getUTCMonth() : date.getMonth();
  const year = utc ? date.getUTCFullYear() : date.getFullYear();
  const base = `${day} ${MONTH_NAMES[month]}`;
  return withYear ? `${base} ${year}` : base;
}
