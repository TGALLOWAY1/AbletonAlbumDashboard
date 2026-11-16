import { describe, expect, it } from "vitest";
import {
  getRangeStats,
  toDayKey,
  type AnalyticsSession,
} from "@/lib/analytics";
import { buildHeatmapGrid } from "@/lib/heatmap";
import {
  WEEKDAY_SHORT,
  buildWeekActivity,
  formatTick,
  weekScale,
} from "@/lib/weekly-activity";

// Wed 26 Aug 2026, 18:00 local. The week under test is Mon 24 → Sun 30, so
// Mon–Wed have happened and Thu–Sun have not. Built from local parts, like
// the heatmap suite, so it depends on the machine's zone and not its clock.
const NOW = new Date(2026, 7, 26, 18, 0, 0);

function at(month: number, date: number, hour = 12, minute = 0): string {
  return new Date(2026, month, date, hour, minute, 0).toISOString();
}

function session(startedAt: string, minutes: number): AnalyticsSession {
  return {
    trackId: "track",
    startedAt,
    durationSeconds: minutes * 60,
    status: "completed",
  };
}

const SESSIONS: AnalyticsSession[] = [
  session(at(7, 23, 20), 90), // Sunday — last week, must not count
  session(at(7, 24, 9), 30), // Monday
  session(at(7, 24, 21), 45), // Monday again: same bar
  session(at(7, 26, 10), 120), // Wednesday (today), before now
  session(at(7, 26, 22), 60), // Wednesday, later than now — not yet
  session(at(7, 28, 10), 60), // Friday — the future
];

describe("buildWeekActivity", () => {
  const week = buildWeekActivity({ sessions: SESSIONS, now: NOW });

  it("is always seven days, Monday first, on the local calendar", () => {
    expect(week.days).toHaveLength(7);
    expect(week.days.map((d) => d.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(week.days[0].date.getDay()).toBe(1); // Monday
    expect(week.days[6].date.getDay()).toBe(0); // Sunday
    expect(week.days.map((d) => d.key)).toEqual([
      "2026-08-24",
      "2026-08-25",
      "2026-08-26",
      "2026-08-27",
      "2026-08-28",
      "2026-08-29",
      "2026-08-30",
    ]);
    expect(toDayKey(week.start)).toBe("2026-08-24");
    expect(toDayKey(week.end)).toBe("2026-08-30");
    expect(week.start.getHours()).toBe(0);
  });

  it("totals each day by the day the session started", () => {
    expect(week.days.map((d) => d.seconds / 60)).toEqual([75, 0, 120, 0, 0, 0, 0]);
    expect(week.totalSeconds).toBe(195 * 60);
  });

  it("leaves last week's Sunday out", () => {
    expect(week.days.some((d) => d.key === "2026-08-23")).toBe(false);
    expect(week.totalSeconds).toBe(195 * 60);
  });

  it("marks today, and only today", () => {
    expect(week.days.filter((d) => d.isToday).map((d) => d.key)).toEqual([
      "2026-08-26",
    ]);
  });

  it("marks the days still to come as future, with nothing on them", () => {
    expect(week.days.map((d) => d.isFuture)).toEqual([
      false,
      false,
      false,
      true,
      true,
      true,
      true,
    ]);
    // A session dated on a future day does not draw a bar there.
    expect(week.days[4].seconds).toBe(0);
    expect(week.elapsedDays).toBe(3);
  });

  it("tells a past day with no work (a zero) from a future one", () => {
    const tuesday = week.days[1];
    const thursday = week.days[3];
    expect(tuesday.seconds).toBe(0);
    expect(tuesday.isFuture).toBe(false);
    expect(thursday.seconds).toBe(0);
    expect(thursday.isFuture).toBe(true);
  });

  it("counts days worked and finds the busiest", () => {
    expect(week.activeDays).toBe(2);
    expect(week.busiest?.key).toBe("2026-08-26");
    expect(WEEKDAY_SHORT[week.busiest!.weekday]).toBe("Wed");
  });

  it("on a Monday only Monday has happened; on a Sunday all seven have", () => {
    const monday = buildWeekActivity({
      sessions: SESSIONS,
      now: new Date(2026, 7, 24, 23, 0, 0),
    });
    expect(monday.elapsedDays).toBe(1);
    expect(monday.days.filter((d) => d.isFuture)).toHaveLength(6);
    expect(monday.days[0].isToday).toBe(true);

    const sunday = buildWeekActivity({
      sessions: SESSIONS,
      now: new Date(2026, 7, 30, 23, 0, 0),
    });
    expect(sunday.elapsedDays).toBe(7);
    expect(sunday.days.some((d) => d.isFuture)).toBe(false);
    expect(sunday.days[6].isToday).toBe(true);
    // Same week either way.
    expect(toDayKey(sunday.start)).toBe(toDayKey(monday.start));
  });

  it("an empty week is seven days of nothing, not no days", () => {
    const empty = buildWeekActivity({ sessions: [], now: NOW });
    expect(empty.days).toHaveLength(7);
    expect(empty.totalSeconds).toBe(0);
    expect(empty.activeDays).toBe(0);
    expect(empty.busiest).toBeNull();
    // Still an axis to be empty against.
    expect(empty.scale.ticks).toEqual([0, 3600]);
  });

  it("ignores sessions with an unparseable start", () => {
    const bad = buildWeekActivity({
      sessions: [session("not a date", 60), ...SESSIONS],
      now: NOW,
    });
    expect(bad.totalSeconds).toBe(week.totalSeconds);
  });

  it("keeps seven distinct local days across a daylight-saving change", () => {
    // Late March and late October cover the change in both hemispheres'
    // common zones; in a zone with no DST this is simply two more weeks.
    for (const now of [new Date(2026, 2, 29, 12), new Date(2026, 9, 25, 12)]) {
      const w = buildWeekActivity({ sessions: [], now });
      expect(new Set(w.days.map((d) => d.key)).size).toBe(7);
      expect(w.days.every((d) => d.date.getHours() === 0)).toBe(true);
    }
  });
});

describe("agreement with the rest of the Progress figures", () => {
  // The claim in the module header: a bar here and a heatmap square for the
  // same day are one number, and the week's total is those days in any range.
  const week = buildWeekActivity({ sessions: SESSIONS, now: NOW });
  const stats = getRangeStats({ sessions: SESSIONS, tasks: [], range: "7d", now: NOW });

  it("each elapsed day equals the range stats' figure for that day", () => {
    for (const day of week.days.filter((d) => !d.isFuture)) {
      expect(day.seconds).toBe(stats.dailyMap.get(day.key) ?? 0);
    }
  });

  it("each elapsed day equals its heatmap square", () => {
    const grid = buildHeatmapGrid({
      start: stats.start,
      end: stats.end,
      dailyMap: stats.dailyMap,
      today: NOW,
    });
    const squares = new Map(
      grid.weeks.flatMap((w) => w.days).map((d) => [d.key, d]),
    );
    for (const day of week.days.filter((d) => !d.isFuture)) {
      expect(squares.get(day.key)?.seconds).toBe(day.seconds);
      expect(squares.get(day.key)?.isToday).toBe(day.isToday);
    }
  });

  it("weeks start on the same Monday as the heatmap's columns", () => {
    const grid = buildHeatmapGrid({
      start: week.start,
      end: week.end,
      dailyMap: new Map(),
      today: NOW,
    });
    expect(grid.weeks).toHaveLength(1);
    expect(grid.weeks[0].days.map((d) => d.key)).toEqual(week.days.map((d) => d.key));
  });
});

describe("weekScale", () => {
  const hours = (n: number) => n * 3600;

  it("never drops below one hour", () => {
    expect(weekScale(0)).toEqual({
      maxSeconds: hours(1),
      stepSeconds: hours(1),
      ticks: [0, hours(1)],
    });
    expect(weekScale(20 * 60).maxSeconds).toBe(hours(1));
  });

  it("rounds the peak up to a whole step", () => {
    expect(weekScale(hours(1)).maxSeconds).toBe(hours(1));
    expect(weekScale(hours(1) + 1).maxSeconds).toBe(hours(2));
    expect(weekScale(hours(2.1)).ticks).toEqual([0, hours(1), hours(2), hours(3)]);
  });

  it("widens the step rather than adding gridlines", () => {
    expect(weekScale(hours(4)).ticks).toHaveLength(5); // 0,1,2,3,4
    expect(weekScale(hours(5)).ticks).toEqual([0, hours(2), hours(4), hours(6)]);
    expect(weekScale(hours(11)).stepSeconds).toBe(hours(3));
    expect(weekScale(hours(24)).ticks).toEqual([
      0,
      hours(6),
      hours(12),
      hours(18),
      hours(24),
    ]);
  });

  it("always covers the peak, starts at zero and stays readable", () => {
    for (let minutes = 0; minutes <= 24 * 60; minutes += 7) {
      const scale = weekScale(minutes * 60);
      expect(scale.maxSeconds).toBeGreaterThanOrEqual(minutes * 60);
      expect(scale.ticks[0]).toBe(0);
      expect(scale.ticks.at(-1)).toBe(scale.maxSeconds);
      expect(scale.ticks.length).toBeLessThanOrEqual(5);
      expect(scale.maxSeconds % scale.stepSeconds).toBe(0);
    }
  });

  it("survives a day longer than a day", () => {
    const scale = weekScale(hours(100));
    expect(scale.maxSeconds).toBeGreaterThanOrEqual(hours(100));
    expect(scale.ticks.length).toBeLessThanOrEqual(5);
  });

  it("labels ticks in whole hours", () => {
    expect(weekScale(hours(2.5)).ticks.map(formatTick)).toEqual(["0", "1h", "2h", "3h"]);
  });
});
