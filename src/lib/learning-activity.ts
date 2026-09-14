/**
 * The resources activity map's model — one row of days, computed once, with no
 * DOM involved.
 *
 * WHY THIS IS NOT THE WORK HEATMAP
 * --------------------------------
 * `src/lib/heatmap.ts` draws *time*: a Monday-aligned week grid shaded by how
 * many minutes were logged, because a producer's week has a shape worth seeing
 * (weekday rows, weekend columns). Learnings are counts, they are sparse, and
 * what the user wants from them is a run — "did I keep this up" — so this is a
 * single strip of days in order, the way a habit tracker draws one.
 *
 * Sharing `buildHeatmapGrid` would have meant teaching it a second unit
 * (`HeatmapDay.seconds` is not a count of anything) and a second layout for
 * the sake of reuse that is skin-deep. What the two *do* share is the day key
 * (`toDayKey`, so both line up with the user's own calendar day), the range
 * vocabulary (`RangeKey`), and the rule that made the work heatmap legible:
 *
 *   **A cell's size never depends on the range.** Cells are a fixed pixel size
 *   in both, so 7D and 1Y are drawn at the same scale and anything wider than
 *   its card scrolls. Month markers likewise carry an explicit **day index**,
 *   never a share of the width, so a label cannot drift off the square it
 *   names.
 */

import { getRangeStart, toDayKey, type RangeKey } from "@/lib/analytics";
import { startOfDay } from "@/lib/heatmap";

/**
 * What each shade means, for the legend and for screen readers.
 *
 * Bands are tight because learnings are rare compared to minutes worked:
 * finishing two resources in a day is already a heavy day, so the scale tops
 * out at five rather than stretching to a number nobody will reach.
 */
export const LEARNING_INTENSITY_BANDS = [
  "nothing learned",
  "1 learned",
  "2 learned",
  "3-4 learned",
  "5 or more learned",
] as const;

export type LearningIntensity = 0 | 1 | 2 | 3 | 4;

export function learningIntensity(count: number): LearningIntensity {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

export type ActivityDay = {
  /** Local-date key, `YYYY-MM-DD`. Unique across the strip, so it is the React key. */
  key: string;
  date: Date;
  count: number;
  intensity: LearningIntensity;
  /** True on the first of a month — where the strip's month markers sit. */
  isMonthStart: boolean;
  isToday: boolean;
};

/**
 * A month label and the day column it belongs over. `column` is an index into
 * `days`, not a pixel offset and not a share of the width.
 */
export type ActivityMonthMarker = { key: string; column: number; label: string };

export type ActivityStrip = {
  days: ActivityDay[];
  monthMarkers: ActivityMonthMarker[];
  /** Everything logged inside the window. */
  total: number;
  /** Days in the window carrying at least one learning. */
  activeDays: number;
  /** The heaviest day in the window, or null if nothing landed in it. */
  busiest: ActivityDay | null;
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

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Every day in `[start, end]`, oldest first, with its count and shade.
 *
 * No padding days: the strip is a run of dates, not a calendar, so there is no
 * week to complete and the first square is exactly the first day of the
 * window.
 */
export function buildActivityStrip({
  start,
  end,
  dailyMap,
  today = new Date(),
}: {
  start: Date;
  end: Date;
  dailyMap: Map<string, number>;
  today?: Date;
}): ActivityStrip {
  const first = startOfDay(start);
  const last = startOfDay(end);
  const now = startOfDay(today);

  const days: ActivityDay[] = [];
  let total = 0;
  let activeDays = 0;
  let busiest: ActivityDay | null = null;

  const cursor = new Date(first);
  while (cursor <= last) {
    const date = new Date(cursor);
    const key = toDayKey(date);
    const count = dailyMap.get(key) ?? 0;
    const day: ActivityDay = {
      key,
      date,
      count,
      intensity: learningIntensity(count),
      isMonthStart: date.getDate() === 1,
      isToday: sameDay(date, now),
    };
    if (count > 0) {
      total += count;
      activeDays += 1;
      if (!busiest || count > busiest.count) busiest = day;
    }
    days.push(day);
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    days,
    monthMarkers: buildMonthMarkers(days),
    total,
    activeDays,
    busiest,
    start: first,
    end: last,
  };
}

/**
 * One label per month, on the column holding its 1st, plus a leading label for
 * the window's own first month — otherwise the opening stretch is the only
 * unnamed one. The leading label is dropped when the next month starts within
 * a few columns of it, where the two words would overlap.
 */
function buildMonthMarkers(days: ActivityDay[]): ActivityMonthMarker[] {
  if (days.length === 0) return [];

  const spansYears =
    days[0].date.getFullYear() !== days[days.length - 1].date.getFullYear();
  const label = (date: Date) => {
    const name = MONTH_NAMES[date.getMonth()];
    // At most one January falls inside a <=1y window, so tagging that one with
    // its year places every other month unambiguously.
    return spansYears && date.getMonth() === 0
      ? `${name} '${String(date.getFullYear()).slice(-2)}`
      : name;
  };

  const markers: ActivityMonthMarker[] = [];
  days.forEach((day, column) => {
    if (day.isMonthStart) {
      markers.push({ key: day.key, column, label: label(day.date) });
    }
  });

  // A label is roughly three cells wide, so a first-of-month that lands inside
  // the first few columns would print on top of the leading one.
  const leadingClashes = markers.length > 0 && markers[0].column < 4;
  if (!leadingClashes && (markers.length === 0 || markers[0].column > 0)) {
    markers.unshift({
      key: `lead-${days[0].key}`,
      column: 0,
      label: label(days[0].date),
    });
  }
  return markers;
}

/**
 * The longest run of consecutive days carrying a learning, and whether that
 * run is still going.
 *
 * Walks the strip rather than the raw map so "consecutive" means consecutive
 * *in the window* — the same window every other figure on the card is measured
 * over, which is the rule the Progress panel was rebuilt around.
 */
export function learningStreaks(strip: ActivityStrip): {
  longest: number;
  current: number;
} {
  let longest = 0;
  let run = 0;
  for (const day of strip.days) {
    if (day.count > 0) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }
  // `run` is the streak the window ends on, which is the live one when the
  // window ends today. A window ending yesterday reports it as current too;
  // every range here ends at `now`, so that case does not arise in the app.
  return { longest, current: run };
}

/** The strip for a range, straight off a day map. One call, one window. */
export function buildRangeStrip({
  dailyMap,
  range,
  now = new Date(),
}: {
  dailyMap: Map<string, number>;
  range: RangeKey;
  now?: Date;
}): ActivityStrip {
  return buildActivityStrip({
    start: getRangeStart(range, now),
    end: now,
    dailyMap,
    today: now,
  });
}
