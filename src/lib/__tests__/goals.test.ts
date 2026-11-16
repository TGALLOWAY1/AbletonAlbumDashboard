import { describe, expect, it } from "vitest";
import {
  getRangeStats,
  getSessionsBetween,
  getTasksCompletedBetween,
  getTasksCompletedInRange,
  trimSeriesToDays,
  type AnalyticsSession,
  type AnalyticsTaskCompletion,
} from "@/lib/analytics";
import {
  GOAL_METRICS,
  GOAL_PERIODS,
  WIDGETS,
  type Goal,
} from "@/lib/dashboard/widgets";
import {
  daysLeftText,
  goalLabel,
  goalProgress,
  goalWindow,
  goalsProgress,
  measureGoalMetric,
} from "@/lib/goals";
import { buildWeekActivity } from "@/lib/weekly-activity";

// Wed 26 Aug 2026, 18:00 local: the week is Mon 24 → Sun 30, the month is
// August. Local parts, so the suite depends on the zone and not the clock.
const NOW = new Date(2026, 7, 26, 18, 0, 0);

function at(month: number, date: number, hour = 12): string {
  return new Date(2026, month, date, hour, 0, 0).toISOString();
}

function session(startedAt: string, minutes: number): AnalyticsSession {
  return { trackId: "t", startedAt, durationSeconds: minutes * 60, status: "completed" };
}

const SESSIONS: AnalyticsSession[] = [
  session(at(6, 31, 20), 60), // 31 July — last month
  session(at(7, 3, 10), 30), // earlier in August
  session(at(7, 23, 20), 90), // Sunday — last week, this month
  session(at(7, 24, 9), 30), // Monday
  session(at(7, 24, 21), 45), // Monday again
  session(at(7, 26, 10), 120), // Wednesday (today)
  session(at(7, 26, 22), 60), // later today than `now`
  session(at(7, 28, 10), 60), // Friday — the future
];

const TASKS: AnalyticsTaskCompletion[] = [
  { completedAt: at(6, 30) }, // July
  { completedAt: at(7, 10) }, // August, an earlier week
  { completedAt: at(7, 24, 8) }, // Monday
  { completedAt: at(7, 26, 9) }, // today
  { completedAt: at(7, 26, 23) }, // today, but after `now`
];

const goal = (metric: Goal["metric"], target: number, period: Goal["period"]): Goal => ({
  metric,
  target,
  period,
});

const measure = (g: Goal) =>
  goalProgress({ goal: g, sessions: SESSIONS, tasks: TASKS, now: NOW });

describe("goalWindow", () => {
  it("a week is the local Monday to Sunday", () => {
    const w = goalWindow("week", NOW);
    expect([w.start.getFullYear(), w.start.getMonth(), w.start.getDate()]).toEqual([2026, 7, 24]);
    expect(w.start.getDay()).toBe(1);
    expect(w.start.getHours()).toBe(0);
    expect(w.lastDay.getDate()).toBe(30);
    expect(w.lastDay.getDay()).toBe(0);
    expect(w.daysLeft).toBe(5); // Wed, Thu, Fri, Sat, Sun
  });

  it("a month is the local calendar month", () => {
    const w = goalWindow("month", NOW);
    expect([w.start.getMonth(), w.start.getDate()]).toEqual([7, 1]);
    expect([w.lastDay.getMonth(), w.lastDay.getDate()]).toEqual([7, 31]);
    expect(w.daysLeft).toBe(6); // 26 → 31
  });

  it("handles February, leap years and December", () => {
    expect(goalWindow("month", new Date(2026, 1, 10)).lastDay.getDate()).toBe(28);
    expect(goalWindow("month", new Date(2028, 1, 10)).lastDay.getDate()).toBe(29);
    const dec = goalWindow("month", new Date(2026, 11, 31, 23, 59));
    expect([dec.lastDay.getFullYear(), dec.lastDay.getMonth(), dec.lastDay.getDate()]).toEqual([
      2026, 11, 31,
    ]);
    expect(dec.daysLeft).toBe(1);
  });

  it("counts today as a day left, and says so on the last one", () => {
    const sunday = goalWindow("week", new Date(2026, 7, 30, 9));
    expect(sunday.daysLeft).toBe(1);
    expect(daysLeftText(sunday)).toBe("last day");
    expect(daysLeftText(goalWindow("week", new Date(2026, 7, 24, 9)))).toBe("7 days left");
  });

  it("a week can straddle two months and two years", () => {
    const w = goalWindow("week", new Date(2027, 0, 1, 12)); // Fri 1 Jan 2027
    expect([w.start.getFullYear(), w.start.getMonth(), w.start.getDate()]).toEqual([2026, 11, 28]);
    expect([w.lastDay.getFullYear(), w.lastDay.getMonth(), w.lastDay.getDate()]).toEqual([
      2027, 0, 3,
    ]);
  });
});

describe("goalLabel", () => {
  it("reads as the examples in the brief", () => {
    expect(goalLabel(goal("sessions", 3, "week"))).toBe("3 sessions this week");
    expect(goalLabel(goal("minutes", 180, "week"))).toBe("3h of work this week");
    expect(goalLabel(goal("tasks", 5, "month"))).toBe("5 tasks done this month");
    expect(goalLabel(goal("days", 4, "week"))).toBe("4 days worked this week");
  });

  it("uses the singular for one", () => {
    expect(goalLabel(goal("sessions", 1, "month"))).toBe("1 session this month");
    expect(goalLabel(goal("tasks", 1, "week"))).toBe("1 task done this week");
    expect(goalLabel(goal("days", 1, "week"))).toBe("1 day worked this week");
  });

  it("writes minutes as a duration", () => {
    expect(goalLabel(goal("minutes", 45, "week"))).toBe("45m of work this week");
    expect(goalLabel(goal("minutes", 90, "week"))).toBe("1h 30m of work this week");
    expect(goalLabel(goal("minutes", 600, "month"))).toBe("10h of work this month");
  });

  it("has wording for every metric and period the registry allows", () => {
    for (const metric of GOAL_METRICS) {
      for (const period of GOAL_PERIODS) {
        expect(goalLabel(goal(metric, 2, period))).toMatch(new RegExp(`this ${period}$`));
      }
    }
  });

  it("labels the widget's own default goals", () => {
    expect(WIDGETS.goals.defaultConfig.goals.map(goalLabel)).toEqual([
      "3 sessions this week",
      "3h of work this week",
      "5 tasks done this week",
    ]);
  });
});

describe("goalProgress — this week", () => {
  it("counts sessions started this week, up to now", () => {
    const p = measure(goal("sessions", 3, "week"));
    expect(p.value).toBe(3); // two on Monday, one today; not tonight's, not Friday's
    expect(p.valueText).toBe("3 / 3");
    expect(p.done).toBe(true);
    expect(p.fraction).toBe(1);
    expect(p.remainingText).toBe("");
  });

  it("totals minutes of work", () => {
    const p = measure(goal("minutes", 240, "week"));
    expect(p.value).toBe(195);
    expect(p.valueText).toBe("3h 15m / 4h");
    expect(p.done).toBe(false);
    expect(p.fraction).toBeCloseTo(195 / 240);
    expect(p.remainingText).toBe("45m to go");
  });

  it("counts tasks ticked this week, up to now", () => {
    const p = measure(goal("tasks", 5, "week"));
    expect(p.value).toBe(2);
    expect(p.valueText).toBe("2 / 5");
    expect(p.done).toBe(false);
    expect(p.remainingText).toBe("3 to go");
  });

  it("counts distinct days worked, not sessions", () => {
    const p = measure(goal("days", 4, "week"));
    expect(p.value).toBe(2); // Monday (two sessions) and Wednesday
    expect(p.valueText).toBe("2 / 4");
  });
});

describe("goalProgress — this month", () => {
  it("reaches back to the 1st and no further", () => {
    expect(measure(goal("sessions", 10, "month")).value).toBe(5);
    expect(measure(goal("minutes", 600, "month")).value).toBe(30 + 90 + 30 + 45 + 120);
    expect(measure(goal("tasks", 10, "month")).value).toBe(3);
    expect(measure(goal("days", 10, "month")).value).toBe(4); // 3rd, 23rd, 24th, 26th
  });
});

describe("done, and the bar", () => {
  it("is done exactly at the target and stays done beyond it", () => {
    expect(measure(goal("sessions", 4, "week")).done).toBe(false);
    expect(measure(goal("sessions", 3, "week")).done).toBe(true);
    const beaten = measure(goal("sessions", 2, "week"));
    expect(beaten.done).toBe(true);
    expect(beaten.fraction).toBe(1); // a beaten goal is a full bar, not 150%
    expect(beaten.valueText).toBe("3 / 2"); // but the count is not capped
  });

  it("is zero, not done, with nothing logged", () => {
    const p = goalProgress({
      goal: goal("minutes", 180, "week"),
      sessions: [],
      tasks: [],
      now: NOW,
    });
    expect(p.value).toBe(0);
    expect(p.fraction).toBe(0);
    expect(p.done).toBe(false);
    expect(p.valueText).toBe("0m / 3h");
    expect(p.remainingText).toBe("3h to go");
  });

  it("judges a time goal on the minutes it prints", () => {
    // 179m 40s rounds to 3h on screen, so it must count as 3h.
    const p = goalProgress({
      goal: goal("minutes", 180, "week"),
      sessions: [{ ...session(at(7, 25), 0), durationSeconds: 179 * 60 + 40 }],
      tasks: [],
      now: NOW,
    });
    expect(p.valueText).toBe("3h / 3h");
    expect(p.done).toBe(true);
  });

  it("does not divide by a zero target", () => {
    const p = measure({ metric: "sessions", target: 0, period: "week" });
    expect(Number.isFinite(p.fraction)).toBe(true);
    expect(p.target).toBe(1);
  });

  it("measures a list in order, each goal on its own window", () => {
    const list = goalsProgress({
      goals: [goal("sessions", 3, "week"), goal("sessions", 10, "month")],
      sessions: SESSIONS,
      tasks: TASKS,
      now: NOW,
    });
    expect(list.map((p) => p.value)).toEqual([3, 5]);
    expect(list.map((p) => p.window.period)).toEqual(["week", "month"]);
    expect(goalsProgress({ goals: [], sessions: SESSIONS, tasks: TASKS, now: NOW })).toEqual([]);
  });

  it("un-does itself when a session is removed — nothing is stored", () => {
    const g = goal("sessions", 3, "week");
    const without = SESSIONS.filter((s) => s.startedAt !== at(7, 24, 9));
    expect(goalProgress({ goal: g, sessions: without, tasks: [], now: NOW }).value).toBe(2);
  });
});

describe("agreement with the Progress figures", () => {
  // A goal over the last seven days' worth of week must equal what the
  // Analytics page prints for a window that covers the same days. On a
  // Sunday, "this week" and the 7D range are the same seven days.
  const SUNDAY = new Date(2026, 7, 30, 21, 0, 0);
  const stats = getRangeStats({ sessions: SESSIONS, tasks: TASKS, range: "7d", now: SUNDAY });
  const at7d = (metric: Goal["metric"]) =>
    goalProgress({
      goal: goal(metric, 1, "week"),
      sessions: SESSIONS,
      tasks: TASKS,
      now: SUNDAY,
    }).value;

  it("sessions, minutes, tasks and days match getRangeStats", () => {
    expect(at7d("sessions")).toBe(stats.sessionCount);
    expect(at7d("minutes")).toBe(Math.round(stats.totalSeconds / 60));
    expect(at7d("tasks")).toBe(stats.tasksCompleted);
    expect(at7d("days")).toBe(stats.activeDays);
  });

  it("days worked matches the bars of the weekly chart", () => {
    const week = buildWeekActivity({ sessions: SESSIONS, now: NOW });
    expect(measure(goal("days", 1, "week")).value).toBe(week.activeDays);
    expect(measure(goal("minutes", 1, "week")).value * 60).toBe(week.totalSeconds);
  });

  it("measureGoalMetric is the same count over an explicit window", () => {
    const start = goalWindow("week", NOW).start;
    expect(measureGoalMetric("sessions", { sessions: SESSIONS, tasks: TASKS, start, now: NOW })).toBe(
      getSessionsBetween(SESSIONS, start, NOW).length,
    );
    expect(measureGoalMetric("tasks", { sessions: SESSIONS, tasks: TASKS, start, now: NOW })).toBe(
      getTasksCompletedBetween(TASKS, start, NOW).length,
    );
  });
});

describe("window helpers added to analytics", () => {
  it("getSessionsBetween includes both ends and drops bad dates", () => {
    const start = new Date(2026, 7, 24);
    const exactStart = session(start.toISOString(), 10);
    const exactEnd = session(NOW.toISOString(), 10);
    const justBefore = session(new Date(start.getTime() - 1).toISOString(), 10);
    const justAfter = session(new Date(NOW.getTime() + 1).toISOString(), 10);
    const bad = session("nonsense", 10);
    expect(
      getSessionsBetween([exactStart, exactEnd, justBefore, justAfter, bad], start, NOW),
    ).toEqual([exactStart, exactEnd]);
  });

  it("the range helpers are the between helpers over the range's window", () => {
    const stats = getRangeStats({ sessions: SESSIONS, tasks: TASKS, range: "30d", now: NOW });
    expect(stats.sessions).toEqual(getSessionsBetween(SESSIONS, stats.start, NOW));
    expect(getTasksCompletedInRange(TASKS, "30d", NOW)).toEqual(
      getTasksCompletedBetween(TASKS, stats.start, NOW),
    );
  });

  it("trimSeriesToDays never removes anything a window of that length needs", () => {
    // The trim runs on the server, whose "now" can be a few hours off the
    // reader's calendar either way. Whatever it keeps, every range stat
    // computed from the trimmed series must equal the untrimmed one.
    for (const [range, days] of [
      ["7d", 7],
      ["30d", 30],
      ["1y", 365],
    ] as const) {
      for (const skewHours of [-14, 0, 14]) {
        const serverNow = new Date(NOW.getTime() + skewHours * 3600_000);
        const trimmed = trimSeriesToDays(SESSIONS, (s) => s.startedAt, days, serverNow);
        const full = getRangeStats({ sessions: SESSIONS, tasks: [], range, now: NOW });
        const cut = getRangeStats({ sessions: trimmed, tasks: [], range, now: NOW });
        expect(cut.sessionCount).toBe(full.sessionCount);
        expect(cut.totalSeconds).toBe(full.totalSeconds);
        expect(cut.activeDays).toBe(full.activeDays);
      }
    }
  });

  it("trimSeriesToDays does drop the old tail, and keeps unparseable rows", () => {
    const old = session(new Date(2025, 0, 1).toISOString(), 10);
    const bad = session("nonsense", 10);
    const recent = session(at(7, 25), 10);
    expect(trimSeriesToDays([old, bad, recent], (s) => s.startedAt, 7, NOW)).toEqual([
      bad,
      recent,
    ]);
  });

  it("a month goal is covered by the 31-day trim the widget uses", () => {
    const trimmed = trimSeriesToDays(SESSIONS, (s) => s.startedAt, 31, NOW);
    const g = goal("minutes", 600, "month");
    expect(goalProgress({ goal: g, sessions: trimmed, tasks: [], now: NOW }).value).toBe(
      goalProgress({ goal: g, sessions: SESSIONS, tasks: [], now: NOW }).value,
    );
  });
});
