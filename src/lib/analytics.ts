export type RangeKey = "7d" | "4w" | "3m" | "6m" | "1y";

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "4w", label: "4W" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1Y" },
];

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

export function rangeToDays(range: RangeKey): number {
  switch (range) {
    case "7d":
      return 7;
    case "4w":
      return 28;
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

