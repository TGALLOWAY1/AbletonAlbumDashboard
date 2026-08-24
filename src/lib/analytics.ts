/**
 * The window every number on the Progress panel is measured over.
 *
 * One control, one window: pick 30D and the heatmap, the total time, the
 * session count and the tasks-done count all mean "the last 30 days". The
 * dashboard used to contradict itself here — a fixed "this week" stat row
 * above a heatmap that defaulted to three months — so the two halves of the
 * page never agreed on what "now" was.
 *
 * `30d` replaced a `4w` (28-day) option: "the last 30 days" is how people
 * actually ask the question, and the four-week framing only existed to make
 * the heatmap's week columns divide evenly.
 */
export type RangeKey = "7d" | "30d" | "3m" | "6m" | "1y";

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1Y" },
];

export const DEFAULT_RANGE: RangeKey = "30d";

export type AnalyticsSession = {
  trackId: string | null;
  startedAt: string;
  durationSeconds: number;
  status: string;
};

export type AnalyticsTrack = {
  id: string;
  status: string;
};

/**
 * One completed task, reduced to the moment it was ticked.
 *
 * Tasks-done is a range stat like time and sessions, so it has to be
 * recomputed as the range changes rather than counted once on the server for a
 * fixed week. All the client needs for that is the timestamps, which is why
 * this is a bare list of ISO strings rather than task rows — a year of them
 * costs a few kilobytes.
 */
export type AnalyticsTaskCompletion = {
  completedAt: string;
};

export function rangeToDays(range: RangeKey): number {
  switch (range) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "3m":
      return 90;
    case "6m":
      return 180;
    case "1y":
      return 365;
  }
}

export function getRangeStart(range: RangeKey, now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (rangeToDays(range) - 1));
  return start;
}

export function getSessionsInRange<T extends { startedAt: string }>(
  sessions: T[],
  range: RangeKey,
  now: Date = new Date(),
): T[] {
  const start = getRangeStart(range, now).getTime();
  const end = now.getTime();
  return sessions.filter((s) => {
    const t = new Date(s.startedAt).getTime();
    return !Number.isNaN(t) && t >= start && t <= end;
  });
}

/**
 * Completed tasks whose tick lands inside the range — both a track's tasks and
 * studio tasks, since both write `actions.completed_at`.
 */
export function getTasksCompletedInRange(
  tasks: AnalyticsTaskCompletion[],
  range: RangeKey,
  now: Date = new Date(),
): AnalyticsTaskCompletion[] {
  const start = getRangeStart(range, now).getTime();
  const end = now.getTime();
  return tasks.filter((t) => {
    const at = new Date(t.completedAt).getTime();
    return !Number.isNaN(at) && at >= start && at <= end;
  });
}

// Local-date key (YYYY-MM-DD) so heatmap squares line up with the user's calendar day.
export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDailyDurationMap(
  sessions: AnalyticsSession[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const date = new Date(s.startedAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = toDayKey(date);
    map.set(key, (map.get(key) ?? 0) + s.durationSeconds);
  }
  return map;
}

// 0 → empty, 1 → 1-30m, 2 → 31-60m, 3 → 61-120m, 4 → 121m+
export function getHeatmapIntensity(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes <= 30) return 1;
  if (minutes <= 60) return 2;
  if (minutes <= 120) return 3;
  return 4;
}

export function getTotalSeconds(sessions: AnalyticsSession[]): number {
  return sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
}

export function getTotalHours(sessions: AnalyticsSession[]): number {
  return getTotalSeconds(sessions) / 3600;
}

export function getSessionCount(sessions: AnalyticsSession[]): number {
  return sessions.length;
}

export function getLongestStreak(dailyMap: Map<string, number>): number {
  const days = Array.from(dailyMap.entries())
    .filter(([, secs]) => secs > 0)
    .map(([key]) => key)
    .sort();
  if (days.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const cur = new Date(days[i]);
    const diffDays = Math.round(
      (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getMostActiveDay(
  dailyMap: Map<string, number>,
): string | null {
  const totals = new Array(7).fill(0);
  for (const [key, secs] of dailyMap.entries()) {
    const day = new Date(key).getDay();
    totals[day] += secs;
  }
  let best = -1;
  let bestIdx = -1;
  totals.forEach((secs, idx) => {
    if (secs > best) {
      best = secs;
      bestIdx = idx;
    }
  });
  return best > 0 ? WEEKDAY_NAMES[bestIdx] : null;
}

export function getAvgSecondsPerTrack(sessions: AnalyticsSession[]): number {
  const trackIds = new Set(
    sessions.map((s) => s.trackId).filter((id): id is string => Boolean(id)),
  );
  if (trackIds.size === 0) return 0;
  return getTotalSeconds(sessions) / trackIds.size;
}

// Of the tracks worked on within the range, the share marked completed.
export function getRangeCompletionRate(
  sessions: AnalyticsSession[],
  tracks: AnalyticsTrack[],
): number {
  const workedTrackIds = new Set(
    sessions.map((s) => s.trackId).filter((id): id is string => Boolean(id)),
  );
  if (workedTrackIds.size === 0) return 0;
  const completed = tracks.filter(
    (t) => workedTrackIds.has(t.id) && t.status === "completed",
  ).length;
  return completed / workedTrackIds.size;
}

export function getSessionsPerWeek(
  sessions: AnalyticsSession[],
  range: RangeKey,
): number {
  const weeks = rangeToDays(range) / 7;
  if (weeks <= 0) return sessions.length;
  return Math.round(sessions.length / weeks);
}


/** Days in the range with any logged time — the denominator is `rangeToDays`. */
export function getActiveDayCount(dailyMap: Map<string, number>): number {
  let days = 0;
  for (const seconds of dailyMap.values()) if (seconds > 0) days += 1;
  return days;
}

/** Mean length of a session in the range, in seconds. */
export function getAvgSecondsPerSession(sessions: AnalyticsSession[]): number {
  if (sessions.length === 0) return 0;
  return getTotalSeconds(sessions) / sessions.length;
}

/**
 * Every number the Progress panel shows, for one range.
 *
 * Computed in one place so the heatmap and the figures printed under it can
 * never be measuring different windows — the bug this whole section was
 * rebuilt to fix. Pure, and takes `now` explicitly, so it is testable without
 * mocking the clock.
 */
export type RangeStats = {
  start: Date;
  end: Date;
  days: number;
  dailyMap: Map<string, number>;
  sessions: AnalyticsSession[];
  sessionCount: number;
  totalSeconds: number;
  tasksCompleted: number;
  activeDays: number;
  longestStreak: number;
  mostActiveDay: string | null;
  avgSecondsPerSession: number;
  avgSecondsPerTrack: number;
  tracksWorked: number;
  sessionsPerWeek: number;
};

export function getRangeStats({
  sessions,
  tasks,
  range,
  now = new Date(),
}: {
  sessions: AnalyticsSession[];
  tasks: AnalyticsTaskCompletion[];
  range: RangeKey;
  now?: Date;
}): RangeStats {
  const rangeSessions = getSessionsInRange(sessions, range, now);
  const dailyMap = getDailyDurationMap(rangeSessions);
  const tracksWorked = new Set(
    rangeSessions.map((s) => s.trackId).filter((id): id is string => Boolean(id)),
  ).size;

  return {
    start: getRangeStart(range, now),
    end: now,
    days: rangeToDays(range),
    dailyMap,
    sessions: rangeSessions,
    sessionCount: rangeSessions.length,
    totalSeconds: getTotalSeconds(rangeSessions),
    tasksCompleted: getTasksCompletedInRange(tasks, range, now).length,
    activeDays: getActiveDayCount(dailyMap),
    longestStreak: getLongestStreak(dailyMap),
    mostActiveDay: getMostActiveDay(dailyMap),
    avgSecondsPerSession: getAvgSecondsPerSession(rangeSessions),
    avgSecondsPerTrack: getAvgSecondsPerTrack(rangeSessions),
    tracksWorked,
    sessionsPerWeek: getSessionsPerWeek(rangeSessions, range),
  };
}
