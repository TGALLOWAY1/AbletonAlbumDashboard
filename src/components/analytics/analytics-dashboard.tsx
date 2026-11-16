"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkHeatmap, HeatmapLegend } from "@/components/analytics/work-heatmap";
import { formatDuration } from "@/lib/utils";
import { useIsClient } from "@/lib/use-is-client";
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

/**
 * The window, as the two dates it actually runs between.
 *
 * It used to name months only ("Jul – Aug 2026"), which read as if the grid
 * covered both months in full when it covered the last 30 days of them. The
 * heatmap's first and last squares are these two dates.
 */
function rangeLabel(start: Date, end: Date) {
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${format(start, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
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

  // The window is cut on the reader's calendar, so it is not computed until
  // the browser is the one rendering (`useIsClient`). This component is
  // server-rendered first, and that render's clock is the server's — UTC on
  // Vercel — so computing there handed anyone east or west of Greenwich a
  // different "today" than hydration produced, and React threw the tree away
  // with a hydration error. The server and the hydration pass now draw the
  // reserved space below instead.
  //
  // The clock is read inside the memo, with the series as its inputs: the
  // window runs to now, so a session logged from this page's History tab and
  // refreshed into the still-mounted panel has to move "now" with it.
  const isClient = useIsClient();
  const stats = useMemo(
    () =>
      isClient
        ? getRangeStats({ sessions, tasks: taskCompletions, range, now: new Date() })
        : null,
    [isClient, sessions, taskCompletions, range],
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
              <p className="min-h-4 text-xs text-muted-foreground">
                {stats &&
                  `${rangeLabel(stats.start, stats.end)} · last ${stats.days} days`}
              </p>
            </div>
            <HeatmapLegend />
          </div>

          {stats ? (
            <>
              <WorkHeatmap
                dailyMap={stats.dailyMap}
                startDate={stats.start}
                endDate={stats.end}
                range={range}
                // A tapped day stays named in the readout after the finger
                // lifts; without this it cleared at once, so on a phone the
                // readout could never be read.
                holdTap
              />

              <RangeHeadline stats={stats} tracks={tracks} />
              <RangeFootnotes stats={stats} />
            </>
          ) : (
            // Roughly the 30-day calendar's height, so the page does not jump
            // when the browser fills it in a frame later.
            <div
              className="min-h-80"
              role="status"
              aria-label="Loading your progress"
            />
          )}
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
