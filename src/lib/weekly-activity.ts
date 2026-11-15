/**
 * The "This Week" chart's model — seven days, Monday to Sunday, and the scale
 * they are drawn against. Pure, no DOM, `now` passed in.
 *
 * WHY A MODEL
 * -----------
 * Same split as `heatmap.ts`: everything about *which day is which* is decided
 * here, where it can be unit-tested with a fixed clock, and the component only
 * turns numbers into heights.
 *
 * It measures with the Progress panel's own primitives (`getSessionsBetween`,
 * `getDailyDurationMap`, `toDayKey` from `analytics.ts`) rather than totalling
 * sessions its own way, so a day's bar here and the same day's square on the
 * heatmap are one number. The week is the reader's local Monday-to-Sunday
 * (`startOfWeekMonday`), which is also how the heatmap aligns its columns.
 *
 * The one thing a week has that a rolling range does not is **days that have
 * not happened**. On a Wednesday, Thursday is not a day with zero work — it is
 * not a day yet. Those carry `isFuture` so the chart can draw them as pending
 * instead of as an empty bar that reads like a missed day.
 */

import { addDays } from "date-fns";
import {
  getDailyDurationMap,
  getSessionsBetween,
  toDayKey,
  type AnalyticsSession,
} from "@/lib/analytics";
import { startOfWeekMonday } from "@/lib/dates";

/** Mon→Sun, short and long. Index 0 is Monday, as everywhere in this app. */
export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const WEEKDAY_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type WeekDay = {
  /** Local-date key, `YYYY-MM-DD` — the same key the heatmap uses for the day. */
  key: string;
  /** Local midnight on that day. */
  date: Date;
  /** 0 = Monday … 6 = Sunday. */
  weekday: number;
  seconds: number;
  isToday: boolean;
  /** After today: not a zero, a day that has not happened yet. */
  isFuture: boolean;
};

export type WeekScale = {
  /** Top of the axis, in seconds. Always a whole number of `stepSeconds`. */
  maxSeconds: number;
  stepSeconds: number;
  /** Gridline values in seconds, ascending, from 0 to `maxSeconds` inclusive. */
  ticks: number[];
};

export type WeekActivity = {
  /** Always seven, Monday first. */
  days: WeekDay[];
  /** Monday 00:00 local. */
  start: Date;
  /** Sunday 00:00 local — the last *day* of the week, not an instant bound. */
  end: Date;
  totalSeconds: number;
  /** Days so far this week (today included) with any time logged. */
  activeDays: number;
  /** Days of the week that have happened, today included: 1 on Monday, 7 on Sunday. */
  elapsedDays: number;
  /** The heaviest day so far, or null if nothing is logged this week. */
  busiest: WeekDay | null;
  scale: WeekScale;
};

const HOUR = 3600;

/** Hour steps the axis may use, smallest first. */
const HOUR_STEPS = [1, 2, 3, 4, 6, 8, 12, 24];

/** At most this many gridlines above zero, so labels never crowd a short box. */
const MAX_TICKS = 4;

/**
 * The axis for a week whose heaviest day is `peakSeconds`.
 *
 * Whole hours, because that is how a session is thought about, and never less
 * than one: a week with nothing in it still gets a 0–1h axis to be empty
 * against, and a single 20-minute session is drawn as a third of an hour
 * rather than stretched to the full height of the chart as if it were a lot.
 */
export function weekScale(peakSeconds: number): WeekScale {
  const peakHours = Math.max(0, peakSeconds) / HOUR;
  const stepHours =
    HOUR_STEPS.find((step) => Math.ceil(peakHours / step) <= MAX_TICKS) ??
    // Unreachable for one day of real work; a guard so bad data cannot
    // produce hundreds of gridlines.
    Math.ceil(peakHours / MAX_TICKS);
  const steps = Math.max(1, Math.ceil(peakHours / stepHours));
  const stepSeconds = stepHours * HOUR;
  return {
    stepSeconds,
    maxSeconds: steps * stepSeconds,
    ticks: Array.from({ length: steps + 1 }, (_, i) => i * stepSeconds),
  };
}

/** "0", "1h", "2h" — the axis only ever lands on whole hours. */
export function formatTick(seconds: number): string {
  return seconds === 0 ? "0" : `${Math.round(seconds / HOUR)}h`;
}

/**
 * The current local week, day by day.
 *
 * Sessions count toward the day they *started* on and only up to `now`, the
 * same two rules `getRangeStats` applies, so the week's total equals the sum
 * of those days in any range that contains them.
 */
export function buildWeekActivity({
  sessions,
  now = new Date(),
}: {
  sessions: AnalyticsSession[];
  now?: Date;
}): WeekActivity {
  const start = startOfWeekMonday(now);
  const todayKey = toDayKey(now);
  const dailyMap = getDailyDurationMap(getSessionsBetween(sessions, start, now));

  let busiest: WeekDay | null = null;
  let totalSeconds = 0;
  let activeDays = 0;
  let elapsedDays = 0;

  const days: WeekDay[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    // `addDays` steps the calendar, not 24 hours, so a daylight-saving week
    // still has seven distinct local days.
    const date = addDays(start, weekday);
    const key = toDayKey(date);
    const isToday = key === todayKey;
    const isFuture = key > todayKey;
    const seconds = isFuture ? 0 : (dailyMap.get(key) ?? 0);
    const day: WeekDay = { key, date, weekday, seconds, isToday, isFuture };

    if (!isFuture) elapsedDays += 1;
    if (seconds > 0) {
      activeDays += 1;
      totalSeconds += seconds;
      if (!busiest || seconds > busiest.seconds) busiest = day;
    }
    days.push(day);
  }

  return {
    days,
    start,
    end: days[6].date,
    totalSeconds,
    activeDays,
    elapsedDays,
    busiest,
    scale: weekScale(busiest?.seconds ?? 0),
  };
}
