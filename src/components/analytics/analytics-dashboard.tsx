"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkHeatmap, HeatmapLegend } from "@/components/analytics/work-heatmap";
import { formatDuration } from "@/lib/utils";
import {
  DEFAULT_RANGE,
  RANGE_OPTIONS,
  getRangeStats,
  type AnalyticsSession,
  type AnalyticsTaskCompletion,
  type AnalyticsTrack,
  type RangeKey,
  type RangeStats,
} from "@/lib/analytics";

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

function rangeLabel(start: Date, end: Date) {
  const startStr = `${MONTH_NAMES[start.getMonth()]}`;
  const endStr = `${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
  if (
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  ) {
    return endStr;
  }
  if (start.getFullYear() !== end.getFullYear()) {
    return `${startStr} ${start.getFullYear()} – ${endStr}`;
  }
  return `${startStr} – ${endStr}`;
}

function formatHours(seconds: number) {
  if (seconds === 0) return "0h";
  return `${(seconds / 3600).toFixed(1)}h`;
}

/**
 * The Progress panel: one range control, one heatmap, and every number
 * underneath measured over the same window.
 *
 * The dashboard used to print a fixed "this week" stat row near the top of the
 * page and a range-switchable heatmap near the bottom, which meant the two
 * halves regularly disagreed — the tiles said seven days while the grid
 * underneath showed three months. There is now one window. Change it and the
 * time, the session count, the tasks ticked and the streak all move with the
 * grid, because they are all read off the same `RangeStats` (see
 * `getRangeStats`).
 */
export function AnalyticsDashboard({
  sessions,
  tracks,
  taskCompletions,
}: {
  sessions: AnalyticsSession[];
  tracks: AnalyticsTrack[];
  taskCompletions: AnalyticsTaskCompletion[];
}) {
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);

  const stats = useMemo(
    () => getRangeStats({ sessions, tasks: taskCompletions, range }),
    [sessions, taskCompletions, range],
  );

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
        <TabsList className="w-full">
          {RANGE_OPTIONS.map((opt) => (
            <TabsTrigger key={opt.key} value={opt.key} className="flex-1">
              {opt.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Work heatmap
              </h3>
              <p className="text-xs text-muted-foreground">
                {rangeLabel(stats.start, stats.end)} · last {stats.days} days
              </p>
            </div>
            <HeatmapLegend />
          </div>

          <WorkHeatmap
            dailyMap={stats.dailyMap}
            startDate={stats.start}
            endDate={stats.end}
          />

          <RangeHeadline stats={stats} tracks={tracks} />
          <RangeFootnotes stats={stats} />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * The four figures that answer "how much work was this?" — time first, because
 * that is the one the heatmap is actually shading.
 */
function RangeHeadline({
  stats,
  tracks,
}: {
  stats: RangeStats;
  tracks: AnalyticsTrack[];
}) {
  const finished = tracks.filter((t) => t.status === "completed").length;

  const figures: { label: string; value: string; caption: string }[] = [
    {
      label: "Time",
      value: stats.totalSeconds > 0 ? formatDuration(stats.totalSeconds) : "0m",
      caption:
        stats.sessionCount > 0
          ? `${formatDuration(Math.round(stats.avgSecondsPerSession))} per session`
          : "nothing logged yet",
    },
    {
      label: "Sessions",
      value: stats.sessionCount.toString(),
      caption: `${stats.sessionsPerWeek}/week`,
    },
    {
      label: "Tasks done",
      value: stats.tasksCompleted.toString(),
      caption: "tracks and studio",
    },
    {
      label: "Days worked",
      value: `${stats.activeDays}`,
      caption: `of ${stats.days} · ${finished} ${finished === 1 ? "track" : "tracks"} finished all-time`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-4">
      {figures.map((f) => (
        <div key={f.label} className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {f.label}
          </span>
          <span className="text-xl font-semibold tabular-nums leading-none">
            {f.value}
          </span>
          <span className="truncate text-[11px] text-muted-foreground">
            {f.caption}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Pattern rather than volume — one line, secondary weight. */
function RangeFootnotes({ stats }: { stats: RangeStats }) {
  const notes = [
    stats.longestStreak > 0
      ? `Longest streak ${stats.longestStreak} day${stats.longestStreak === 1 ? "" : "s"}`
      : null,
    stats.mostActiveDay ? `Most active on ${stats.mostActiveDay}` : null,
    stats.tracksWorked > 0
      ? `${stats.tracksWorked} ${stats.tracksWorked === 1 ? "track" : "tracks"} touched · ${formatHours(stats.avgSecondsPerTrack)} each`
      : null,
  ].filter(Boolean) as string[];

  if (notes.length === 0) {
    return (
      <p className="border-t border-border pt-3 text-xs text-muted-foreground">
        No sessions in this range. Log one from the header, or start a focus
        session on a track.
      </p>
    );
  }

  return (
    <p className="border-t border-border pt-3 text-xs text-muted-foreground">
      {notes.join(" · ")}
    </p>
  );
}
