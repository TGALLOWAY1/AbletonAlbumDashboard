/**
 * The heatmap's grid model — everything about *where a day sits* and *what it
 * is called*, computed once, in one place, with no DOM involved.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The grid used to be built inline in `work-heatmap.tsx` out of flex columns
 * that each took `flex-1` of the card's width. Three things fell out of that
 * and all three were visible on the dashboard:
 *
 *   1. **Cells were sized by the range, not by the eye.** A square that is
 *      `flex-1` wide and `aspect-square` tall is as tall as it is wide, so the
 *      fewer columns a range had, the more enormous its squares became. 7D
 *      renders two week-columns; on a 1080px card that is a 525px square, and
 *      a heatmap around 3,700px tall. 1Y went the other way: 53 columns on a
 *      phone left ~2px of square between 3px gaps.
 *   2. **The weekday gutter was aligned to nothing.** Its labels sat in
 *      `w-6 aspect-square` boxes — 24px tall, always — while the grid rows
 *      were as tall as a column was wide. The two only agreed at one
 *      viewport width, by accident, and at no range.
 *   3. **Month labels pointed at the wrong column.** They were a parallel flex
 *      row (`pl-7` guessing at a `w-6` gutter plus a 3px gap) whose cells
 *      divided a *different* width than the grid's, and the month was decided
 *      by the first day of each column — so a month that began mid-week got
 *      labelled on the following column.
 *
 * So the geometry is fixed now: a cell is a fixed pixel size, columns are
 * whatever that adds up to, and anything wider than the card scrolls. The
 * month markers below carry an explicit **column index**, and the component
 * positions them off the same cell/gap variables the grid is drawn with — the
 * label and the column it names can no longer drift apart.
 */

import {
  getHeatmapIntensity,
  parseDayKey,
  toDayKey,
  type RangeKey,
} from "@/lib/analytics";

/**
 * How a range is drawn.
 *
 * A month of work and a year of work are not the same picture and should not
 * pretend to be. Short ranges get `calendar`: seven weekday columns, week
 * rows, and the day of the month printed in every square, so "what day is
 * that" needs no hovering. Long ranges get `trail`: the compact
 * week-per-column strip, where individual dates are unreadable anyway and the
 * shape over months is the point.
 */
export type HeatmapMode = "calendar" | "trail";

export const HEATMAP_MODE: Record<RangeKey, HeatmapMode> = {
  "7d": "calendar",
  "30d": "calendar",
  "3m": "trail",
  "6m": "trail",
  "1y": "trail",
};

export function heatmapMode(range: RangeKey): HeatmapMode {
  return HEATMAP_MODE[range];
}

/** What each intensity step means, for the legend and for screen readers. */
export const INTENSITY_BANDS = [
  "no work",
  "up to 30m",
  "30m to 1h",
  "1h to 2h",
  "over 2h",
] as const;

export type HeatmapDay = {
  /** Local-date key, `YYYY-MM-DD`. Unique across the grid, so it is the React key. */
  key: string;
  date: Date;
  /** False for the days the Monday/Sunday padding adds outside the window. */
  inRange: boolean;
  seconds: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  /** True on the first of a month — the calendar view prints the month here. */
  isMonthStart: boolean;
  isToday: boolean;
};

/** One column in `trail` mode, one row in `calendar` mode. Always Mon→Sun, always 7. */
export type HeatmapWeek = { index: number; days: HeatmapDay[] };

/**
 * A month label and the week column it belongs over.
 *
 * `column` is an index into `weeks`, not a pixel offset and not a share of the
 * width — the component turns it into a position with the same cell and gap
 * sizes it draws the grid with.
 */
export type MonthMarker = { key: string; column: number; label: string };

export type HeatmapGrid = {
  weeks: HeatmapWeek[];
  monthMarkers: MonthMarker[];
  /** The heaviest day in the window, or null if nothing was logged. */
  busiest: HeatmapDay | null;
  start: Date;
  end: Date;
};

const MONTH_NAMES = [
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

/** Midnight, local, on the same calendar day. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Re-exported so callers of the grid model do not need both modules. */
export { parseDayKey };

/** Monday on or before `date` (weeks start Monday everywhere in this grid). */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Mon = 0
  return d;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Build the full Monday-aligned grid covering `[start, end]`.
 *
 * Padding days (the ones before `start` and after `end` that complete the
 * first and last week) are returned rather than dropped, so every week is
 * exactly seven cells and row `n` is always the same weekday. They carry
 * `inRange: false`; the component draws them as ghosts.
 */
export function buildHeatmapGrid({
  start,
  end,
  dailyMap,
  today = new Date(),
}: {
  start: Date;
  end: Date;
  dailyMap: Map<string, number>;
  today?: Date;
}): HeatmapGrid {
  const first = startOfDay(start);
  const last = startOfDay(end);
  const gridStart = startOfWeek(first);
  const now = startOfDay(today);

  const weeks: HeatmapWeek[] = [];
  const cursor = new Date(gridStart);
  let busiest: HeatmapDay | null = null;

  // Walk whole weeks until one starts after the last in-range day.
  while (cursor <= last) {
    const days: HeatmapDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(cursor);
      const key = toDayKey(date);
      const inRange = date >= first && date <= last;
      const seconds = inRange ? (dailyMap.get(key) ?? 0) : 0;
      const day: HeatmapDay = {
        key,
        date,
        inRange,
        seconds,
        intensity: inRange ? getHeatmapIntensity(seconds / 60) : 0,
        isMonthStart: date.getDate() === 1,
        isToday: sameDay(date, now),
      };
      if (inRange && seconds > 0 && (!busiest || seconds > busiest.seconds)) {
        busiest = day;
      }
      days.push(day);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push({ index: weeks.length, days });
  }

  return {
    weeks,
    monthMarkers: buildMonthMarkers(weeks, first, last),
    busiest,
    start: first,
    end: last,
  };
}

/**
 * One label per month, anchored to the column that actually *contains* the
 * 1st — not to the column after it, which is what labelling by "the month of
 * this column's Monday" produced.
 *
 * The window's own first month gets a leading label too, since it is otherwise
 * the only unnamed stretch on the grid. That one is dropped when the next real
 * month starts within two columns, where the two labels would collide.
 */
function buildMonthMarkers(
  weeks: HeatmapWeek[],
  first: Date,
  last: Date,
): MonthMarker[] {
  const spansYears = first.getFullYear() !== last.getFullYear();
  const label = (date: Date) => {
    const name = MONTH_NAMES[date.getMonth()];
    // At most one January can fall inside a ≤1y window, so tagging that one
    // with its year is enough to place every other month unambiguously.
    const needsYear = spansYears && date.getMonth() === 0;
    return needsYear
      ? `${name} '${String(date.getFullYear()).slice(-2)}`
      : name;
  };

  const markers: MonthMarker[] = [];
  for (const week of weeks) {
    const monthStart = week.days.find((d) => d.inRange && d.isMonthStart);
    if (!monthStart) continue;
    markers.push({
      key: monthStart.key,
      column: week.index,
      label: label(monthStart.date),
    });
  }

  const leadingClashes = markers.length > 0 && markers[0].column < 2;
  if (!leadingClashes && (markers.length === 0 || markers[0].column > 0)) {
    markers.unshift({
      key: `lead-${toDayKey(first)}`,
      column: 0,
      label: label(first),
    });
  }

  return markers;
}
