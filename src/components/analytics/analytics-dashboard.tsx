"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BOTTLENECK_CATEGORIES, BOTTLENECK_LABELS } from "@/lib/types";
import { WorkHeatmap, HeatmapLegend } from "@/components/analytics/work-heatmap";
import {
  RANGE_OPTIONS,
  getRangeStart,
  getSessionsInRange,
  getDailyDurationMap,
  getTotalHours,
  getLongestStreak,
  getMostActiveDay,
  getBottleneckCounts,
  getAvgSecondsPerTrack,
  getRangeCompletionRate,
  getSessionsPerWeek,
  getTopBottleneck,
  type RangeKey,
  type AnalyticsSession,
  type AnalyticsTrack,
  type AnalyticsBottleneck,
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

function formatHours(seconds: number) {
  if (seconds === 0) return "0h";
  return `${(seconds / 3600).toFixed(1)}h`;
}

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

export function AnalyticsDashboard({
  sessions,
  tracks,
  bottlenecks,
}: {
  sessions: AnalyticsSession[];
  tracks: AnalyticsTrack[];
  bottlenecks: AnalyticsBottleneck[];
}) {
  const [range, setRange] = useState<RangeKey>("3m");

  const view = useMemo(() => {
    const now = new Date();
    const start = getRangeStart(range, now);
    const rangeSessions = getSessionsInRange(sessions, range, now);
    const dailyMap = getDailyDurationMap(rangeSessions);
    const rangeBottlenecks = getSessionsInRange(
      bottlenecks.map((b) => ({ ...b, startedAt: b.createdAt })),
      range,
      now,
    );
    const counts = getBottleneckCounts(rangeBottlenecks, BOTTLENECK_CATEGORIES);

    return {
      start,
      end: now,
      rangeSessions,
      dailyMap,
      counts,
      avgSecondsPerTrack: getAvgSecondsPerTrack(rangeSessions),
      completionRate: getRangeCompletionRate(rangeSessions, tracks),
      sessionsPerWeek: getSessionsPerWeek(rangeSessions, range),
      topBottleneck: getTopBottleneck(counts),
      totalHours: getTotalHours(rangeSessions),
      longestStreak: getLongestStreak(dailyMap),
      mostActiveDay: getMostActiveDay(dailyMap),
    };
  }, [sessions, tracks, bottlenecks, range]);

  const tiles = [
    {
      label: "Avg time per track",
      value: formatHours(view.avgSecondsPerTrack),
      caption: "Session time / tracks worked on",
    },
    {
      label: "Completion rate",
      value: `${Math.round(view.completionRate * 100)}%`,
      caption: "Worked tracks marked completed",
    },
    {
      label: "Sessions / week",
      value: view.sessionsPerWeek.toString(),
      caption: "Avg per week in range",
    },
    {
      label: "Top bottleneck",
      value: view.topBottleneck
        ? (BOTTLENECK_LABELS[view.topBottleneck] ?? view.topBottleneck)
        : "—",
      caption: "Most-recurring category",
    },
  ];

  const maxCount = view.counts[0]?.count ?? 0;
  const insights = [
    { label: "Most active day", value: view.mostActiveDay ?? "—" },
    {
      label: "Longest streak",
      value:
        view.longestStreak > 0
          ? `${view.longestStreak} day${view.longestStreak === 1 ? "" : "s"}`
          : "—",
    },
    { label: "Total hours", value: formatHours(view.totalHours * 3600) },
    { label: "Sessions", value: view.rangeSessions.length.toString() },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Progress</h1>
        <p className="mt-1 text-muted-foreground">
          The patterns underneath the work.
        </p>
      </header>

      <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
        <TabsList className="w-full">
          {RANGE_OPTIONS.map((opt) => (
            <TabsTrigger key={opt.key} value={opt.key} className="flex-1">
              {opt.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="flex flex-col gap-1 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t.label}
              </div>
              <div className="text-2xl font-semibold">{t.value}</div>
              <p className="text-xs text-muted-foreground">{t.caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Work Heatmap
              <Info className="h-3.5 w-3.5" />
            </h2>
            <HeatmapLegend />
          </div>

          <div className="text-xs text-muted-foreground">
            {rangeLabel(view.start, view.end)}
          </div>

          <WorkHeatmap
            dailyMap={view.dailyMap}
            startDate={view.start}
            endDate={view.end}
          />

          <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>Summary</span>
            <span>
              {view.rangeSessions.length} session
              {view.rangeSessions.length === 1 ? "" : "s"} •{" "}
              {view.totalHours.toFixed(1)}h total
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {insights.map((ins) => (
              <div key={ins.label} className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {ins.label}
                </span>
                <span className="text-sm font-medium">{ins.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Bottleneck categories
          </h2>
          <ul className="flex flex-col gap-2">
            {view.counts.map(({ category, count }) => {
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <li
                  key={category}
                  className="flex items-center gap-2 text-sm sm:gap-3"
                >
                  <Badge
                    variant="warning"
                    className="w-24 shrink-0 justify-center text-[10px] sm:w-32 sm:text-xs"
                  >
                    {BOTTLENECK_LABELS[category] ?? category}
                  </Badge>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full bg-warning"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Total sessions logged: {sessions.length}
      </p>
    </div>
  );
}
