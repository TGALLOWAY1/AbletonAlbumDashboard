"use client";

import { formatDayMonth } from "@/lib/local-day";
import { useIsClient } from "@/lib/use-is-client";

/**
 * A stored timestamp printed as the reader's own calendar day.
 *
 * The shelves and the detail page are server components, so a plain `format()`
 * there runs in the server's zone — UTC on Vercel. A resource archived at
 * 6pm in California is 1am UTC the next morning, so the poster caption said
 * "14 Sep" while the activity map, computed in the browser, put its square on
 * the 13th. The same library, disagreeing with itself about what day it was.
 *
 * The zone is a browser fact, so the *first* render — on the server and again
 * during hydration — deliberately formats in UTC. Both therefore produce
 * identical text and there is no mismatch for React to recover from; the local
 * day arrives on the paint after mount (see `useIsClient`). The
 * machine-readable `dateTime` carries the full instant either way.
 */
export function LocalDate({
  iso,
  withYear = false,
  className,
}: {
  /** An ISO 8601 timestamp, as stored. */
  iso: string;
  withYear?: boolean;
  className?: string;
}) {
  const isClient = useIsClient();
  const text = formatDayMonth(new Date(iso), { withYear, utc: !isClient });

  if (!text) return null;
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
