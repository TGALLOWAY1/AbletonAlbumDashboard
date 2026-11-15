/**
 * Goals, measured — how far along a target is, worked out from the records
 * that already exist. Pure, no DOM, `now` passed in.
 *
 * A goal is three settings on a widget (`metric`, `target`, `period`) and
 * nothing else: no table, no counter, nothing that is incremented when a
 * session is logged. Progress is counted off the session and task-completion
 * series every time it is drawn (see the note on `GOAL_METRICS` in the widget
 * registry), so deleting a mislogged session takes it back out of the goal
 * with no bookkeeping, and a goal can never claim work the log does not hold.
 *
 * ONE DEFINITION PER NUMBER
 * -------------------------
 * Every count here is built from `analytics.ts`: the window membership rule is
 * `getSessionsBetween` / `getTasksCompletedBetween` (what `getRangeStats`
 * filters with), a "day worked" is `getActiveDayCount` over
 * `getDailyDurationMap` (what shades a heatmap square), and time is
 * `getTotalSeconds`. A goal's "4 days worked this week" is therefore exactly
 * the number of filled squares the heatmap draws for those days.
 *
 * The windows are the reader's own calendar — the local Monday-to-Sunday week
 * and the local calendar month — and both run *to now*: a goal measures what
 * has been done so far, not what is scheduled.
 */

import { addDays } from "date-fns";
import {
  getActiveDayCount,
  getDailyDurationMap,
  getSessionCount,
  getSessionsBetween,
  getTasksCompletedBetween,
  getTotalSeconds,
  type AnalyticsSession,
  type AnalyticsTaskCompletion,
} from "@/lib/analytics";
import { startOfWeekMonday } from "@/lib/dates";
import type { Goal, GoalMetric, GoalPeriod } from "@/lib/dashboard/widgets";
import { formatDuration } from "@/lib/utils";

export type GoalWindow = {
  period: GoalPeriod;
  /** Local midnight on the first day of the week or month. */
  start: Date;
  /** Local midnight on its last day (Sunday, or the last of the month). */
  lastDay: Date;
  /** Calendar days from today to `lastDay`, today included — never below 1. */
  daysLeft: number;
};

export type GoalProgress = {
  goal: Goal;
  window: GoalWindow;
  /** What the goal says, e.g. "3 sessions this week". */
  label: string;
  /** Progress so far, in the goal's own unit (minutes for a time goal). */
  value: number;
  target: number;
  /** `value / target`, held to 0–1 so a beaten goal still draws a full bar. */
  fraction: number;
  done: boolean;
  /** "2 / 3", or "1h 20m / 3h" for a time goal. */
  valueText: string;
  /** "1 to go", "1h 40m to go" — empty once the goal is met. */
  remainingText: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** The current week or month on the reader's calendar. */
export function goalWindow(period: GoalPeriod, now: Date = new Date()): GoalWindow {
  const start =
    period === "week"
      ? startOfWeekMonday(now)
      : new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay =
    period === "week"
      ? addDays(start, 6)
      : // Day 0 of next month is the last day of this one.
        new Date(now.getFullYear(), now.getMonth() + 1, 0);
  // Rounded, because two local midnights are 23 or 25 hours apart across a
  // daylight-saving change.
  const daysLeft =
    Math.round((lastDay.getTime() - startOfLocalDay(now).getTime()) / DAY_MS) + 1;
  return { period, start, lastDay, daysLeft: Math.max(1, daysLeft) };
}

const PERIOD_PHRASE: Record<GoalPeriod, string> = {
  week: "this week",
  month: "this month",
};

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** A count of minutes as a duration: 180 → "3h", 90 → "1h 30m", 45 → "45m". */
function minutesText(minutes: number): string {
  return formatDuration(minutes * 60);
}

/** The goal as a sentence fragment: "3 sessions this week". */
export function goalLabel(goal: Goal): string {
  const when = PERIOD_PHRASE[goal.period];
  switch (goal.metric) {
    case "sessions":
      return `${plural(goal.target, "session", "sessions")} ${when}`;
    case "minutes":
      return `${minutesText(goal.target)} of work ${when}`;
    case "tasks":
      return `${plural(goal.target, "task", "tasks")} done ${when}`;
    case "days":
      return `${plural(goal.target, "day", "days")} worked ${when}`;
  }
}

/**
 * The measured figure for one metric over `[start, now]`.
 *
 * Minutes are rounded the way `formatDuration` rounds them, so the number a
 * goal is judged on is the number it prints — "3h / 3h" is never "not yet".
 */
export function measureGoalMetric(
  metric: GoalMetric,
  {
    sessions,
    tasks,
    start,
    now,
  }: {
    sessions: AnalyticsSession[];
    tasks: AnalyticsTaskCompletion[];
    start: Date;
    now: Date;
  },
): number {
  if (metric === "tasks") {
    return getTasksCompletedBetween(tasks, start, now).length;
  }
  const inWindow = getSessionsBetween(sessions, start, now);
  switch (metric) {
    case "sessions":
      return getSessionCount(inWindow);
    case "minutes":
      return Math.round(getTotalSeconds(inWindow) / 60);
    case "days":
      return getActiveDayCount(getDailyDurationMap(inWindow));
  }
}

/** How far along one goal is right now. */
export function goalProgress({
  goal,
  sessions,
  tasks,
  now = new Date(),
}: {
  goal: Goal;
  sessions: AnalyticsSession[];
  tasks: AnalyticsTaskCompletion[];
  now?: Date;
}): GoalProgress {
  const window = goalWindow(goal.period, now);
  const value = measureGoalMetric(goal.metric, {
    sessions,
    tasks,
    start: window.start,
    now,
  });
  const target = Math.max(1, goal.target);
  const done = value >= target;
  const isTime = goal.metric === "minutes";
  const left = Math.max(0, target - value);

  return {
    goal,
    window,
    label: goalLabel(goal),
    value,
    target,
    fraction: Math.min(1, value / target),
    done,
    valueText: isTime
      ? `${minutesText(value)} / ${minutesText(target)}`
      : `${value} / ${target}`,
    remainingText: done ? "" : `${isTime ? minutesText(left) : left} to go`,
  };
}

/** Every goal on a widget, in the order they were set. */
export function goalsProgress({
  goals,
  sessions,
  tasks,
  now = new Date(),
}: {
  goals: readonly Goal[];
  sessions: AnalyticsSession[];
  tasks: AnalyticsTaskCompletion[];
  now?: Date;
}): GoalProgress[] {
  return goals.map((goal) => goalProgress({ goal, sessions, tasks, now }));
}

/** "3 days left" / "last day" — how long the goal's window still runs. */
export function daysLeftText(window: GoalWindow): string {
  return window.daysLeft <= 1 ? "last day" : `${window.daysLeft} days left`;
}
