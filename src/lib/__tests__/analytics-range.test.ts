import { describe, expect, it } from "vitest";
import {
  DEFAULT_RANGE,
  RANGE_OPTIONS,
  getActiveDayCount,
  getAvgSecondsPerSession,
  getRangeStats,
  getTasksCompletedInRange,
  rangeToDays,
  type AnalyticsSession,
  type AnalyticsTaskCompletion,
  type RangeKey,
} from "@/lib/analytics";

// Fixed clock: every assertion below counts days back from here, so a real
// `new Date()` anywhere in the range maths would make this suite flaky.
const NOW = new Date("2026-08-24T18:00:00");

function daysAgo(n: number, hour = 12): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function session(days: number, minutes: number): AnalyticsSession {
  return {
    trackId: `track-${days}`,
    startedAt: daysAgo(days),
    durationSeconds: minutes * 60,
    status: "completed",
  };
}

function task(days: number): AnalyticsTaskCompletion {
  return { completedAt: daysAgo(days) };
}

describe("range options", () => {
  it("offers 30D and defaults to it", () => {
    expect(RANGE_OPTIONS.map((o) => o.key)).toEqual([
      "7d",
      "30d",
      "3m",
      "6m",
      "1y",
    ]);
    expect(DEFAULT_RANGE).toBe("30d");
    expect(rangeToDays("30d")).toBe(30);
  });

  it("every option has a day count", () => {
    for (const opt of RANGE_OPTIONS) {
      expect(rangeToDays(opt.key)).toBeGreaterThan(0);
    }
  });
});

describe("getRangeStats", () => {
  // One session inside a week, one inside a month, one outside both.
  const sessions = [session(1, 60), session(20, 30), session(200, 120)];
  const tasks = [task(0), task(2), task(15), task(100)];

  const stats = (range: RangeKey) =>
    getRangeStats({ sessions, tasks, range, now: NOW });

  it("counts only what falls inside the window", () => {
    const week = stats("7d");
    expect(week.sessionCount).toBe(1);
    expect(week.totalSeconds).toBe(60 * 60);
    expect(week.days).toBe(7);
  });

  it("widening the range widens every figure with it", () => {
    // This is the whole point of the rebuild: the heatmap and the numbers
    // under it read from one window, so switching 7D → 30D has to move both.
    const week = stats("7d");
    const month = stats("30d");

    expect(month.sessionCount).toBe(2);
    expect(month.totalSeconds).toBe(90 * 60);
    expect(month.sessionCount).toBeGreaterThan(week.sessionCount);
    expect(month.totalSeconds).toBeGreaterThan(week.totalSeconds);
    expect(month.tasksCompleted).toBeGreaterThan(week.tasksCompleted);
    expect(month.dailyMap.size).toBeGreaterThan(week.dailyMap.size);
  });

  it("counts tasks completed in the window, both kinds", () => {
    expect(stats("7d").tasksCompleted).toBe(2);
    expect(stats("30d").tasksCompleted).toBe(3);
    expect(stats("1y").tasksCompleted).toBe(4);
  });

  it("reports active days against the range length", () => {
    const month = stats("30d");
    expect(month.activeDays).toBe(2);
    expect(month.days).toBe(30);
    expect(month.activeDays).toBeLessThanOrEqual(month.days);
  });

  it("derives per-session and per-track averages from the same window", () => {
    const month = stats("30d");
    expect(month.avgSecondsPerSession).toBe((90 * 60) / 2);
    expect(month.tracksWorked).toBe(2);
    expect(month.avgSecondsPerTrack).toBe((90 * 60) / 2);
  });

  it("is all zeroes, not NaN, when nothing is in range", () => {
    const empty = getRangeStats({
      sessions: [],
      tasks: [],
      range: "7d",
      now: NOW,
    });
    expect(empty.sessionCount).toBe(0);
    expect(empty.totalSeconds).toBe(0);
    expect(empty.tasksCompleted).toBe(0);
    expect(empty.activeDays).toBe(0);
    expect(empty.avgSecondsPerSession).toBe(0);
    expect(empty.avgSecondsPerTrack).toBe(0);
    expect(empty.mostActiveDay).toBeNull();
  });
});

describe("range stat helpers", () => {
  it("ignores unparseable completion timestamps rather than counting them", () => {
    const counted = getTasksCompletedInRange(
      [{ completedAt: "not a date" }, task(1)],
      "7d",
      NOW,
    );
    expect(counted).toHaveLength(1);
  });

  it("counts only days with logged time as active", () => {
    const map = new Map([
      ["2026-08-24", 3600],
      ["2026-08-23", 0],
      ["2026-08-22", 60],
    ]);
    expect(getActiveDayCount(map)).toBe(2);
  });

  it("averages zero sessions to zero", () => {
    expect(getAvgSecondsPerSession([])).toBe(0);
  });
});
