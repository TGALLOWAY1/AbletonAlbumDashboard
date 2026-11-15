"use client";

import { useMemo } from "react";
import { differenceInCalendarDays } from "date-fns";
import { LocalDate } from "@/components/local-date";
import { useIsClient } from "@/lib/use-is-client";

/**
 * How long ago a day was, counted in the reader's calendar days — a session
 * at 11pm last night is "yesterday" at 8am, not "9 hours ago".
 */
export function daysAgoText(date: Date, now: Date): string {
  const days = differenceInCalendarDays(now, date);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

/**
 * When a session happened: its date, and in a wider box how long ago.
 *
 * Both are the reader's calendar, which the server does not know. The date
 * goes through `LocalDate` (UTC on the first render, local a paint later, so
 * hydration always matches); "how long ago" has no honest server answer at
 * all, so it is simply absent until the browser is the one rendering.
 */
export function RecentSessionWhen({ iso }: { iso: string }) {
  const isClient = useIsClient();
  const ago = useMemo(
    () => (isClient ? daysAgoText(new Date(iso), new Date()) : null),
    [isClient, iso],
  );

  return (
    <>
      <LocalDate iso={iso} />
      {ago && <span className="hidden @md/widget:inline"> · {ago}</span>}
    </>
  );
}
