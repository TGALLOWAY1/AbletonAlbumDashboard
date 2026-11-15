"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { HeatmapLegend, WorkHeatmap } from "@/components/analytics/work-heatmap";
import { WidgetBody, WidgetHeader } from "@/components/dashboard/widget-parts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RANGE_LONG_LABELS,
  RANGE_OPTIONS,
  getRangeStats,
  parseDayKey,
  type AnalyticsSession,
  type AnalyticsTaskCompletion,
  type RangeKey,
  type RangeStats,
} from "@/lib/analytics";
import { heatmapMode, type HeatmapMode } from "@/lib/heatmap";
import { ANALYTICS_PATH } from "@/lib/progress-tab";
import { useIsClient } from "@/lib/use-is-client";
import { cn, formatDuration } from "@/lib/utils";

/**
 * Where the figures go, per drawing.
 *
 * The two drawings have very different footprints: the compact calendar is a
 * 130px block whatever the range, while a trail is as wide as its weeks. So
 * the calendar can give up a side column from 17.5rem and the trail needs 28rem
 * before its first three months stop scrolling. Below that width the figures
 * go under the grid when the box is tall enough (or stacked on a phone), and
 * otherwise shrink to one line in the heatmap's own readout.
 *
 * Spelled out as whole class names because Tailwind has to see them.
 */
const LAYOUT: Record<
  HeatmapMode,
  { row: string; side: string; noSide: string; essentials: string; busiest: string }
> = {
  calendar: {
    row: "@[17.5rem]/widget:flex-row",
    side: "hidden @[17.5rem]/widget:flex",
    noSide: "@[17.5rem]/widget:hidden",
    essentials: "@[17.5rem]/widget:hidden widget-h4:hidden dash-stack:hidden",
    busiest: "hidden @[17.5rem]/widget:inline widget-h4:inline dash-stack:inline",
  },
  trail: {
    row: "@md/widget:flex-row",
    side: "hidden @md/widget:flex",
    noSide: "@md/widget:hidden",
    essentials: "@md/widget:hidden widget-h4:hidden dash-stack:hidden",
    busiest: "hidden @md/widget:inline widget-h4:inline dash-stack:inline",
  },
};

/**
 * The Large box (five rows tall, 32rem wide) and up gets the Analytics page's
 * own drawing — dates in the squares, bigger trail cells. Everything smaller
 * gets the compact one. Both are mounted and CSS picks, because a widget is
 * never told its size.
 */
const COMPACT_ONLY = "widget-h5:@lg/widget:hidden";
const ROOMY_ONLY = "hidden widget-h5:@lg/widget:block";

export function WorkHeatmapPanel({
  title,
  initialRange,
  sessions,
  taskCompletions,
}: {
  title: string;
  initialRange: RangeKey;
  sessions: AnalyticsSession[];
  taskCompletions: AnalyticsTaskCompletion[];
}) {
  const [range, setRange] = useState<RangeKey>(initialRange);

  // The window is cut on the reader's calendar, so it is not computed until
  // the browser is the one rendering — see `useIsClient`. The server and the
  // hydration pass both draw the reserved space below.
  const isClient = useIsClient();
  const now = useMemo(() => (isClient ? new Date() : null), [isClient]);
  const stats = useMemo(
    () =>
      now ? getRangeStats({ sessions, tasks: taskCompletions, range, now }) : null,
    [sessions, taskCompletions, range, now],
  );

  const mode = heatmapMode(range);
  const layout = LAYOUT[mode];

  return (
    <>
      <WidgetHeader
        title={title}
        meta={<RangeSelect range={range} onChange={setRange} />}
        action={
          <Link
            href={ANALYTICS_PATH}
            aria-label="Open Analytics for the full heatmap"
            title="Open Analytics"
            className="-mr-1.5 flex h-7 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground pointer-coarse:h-9 pointer-coarse:px-2.5"
          >
            <span className="hidden @md/widget:inline">Analytics</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />
      <WidgetBody>
        {stats ? (
          <div className="flex flex-col gap-3">
            <div className={cn("flex flex-col gap-4", layout.row)}>
              <div
                className={cn(
                  "min-w-0",
                  // A trail takes what the figures leave and scrolls inside
                  // it; the calendar is as wide as its seven columns.
                  mode === "trail" && "flex-1",
                )}
              >
                <div className={COMPACT_ONLY}>
                  <WorkHeatmap
                    dailyMap={stats.dailyMap}
                    startDate={stats.start}
                    endDate={stats.end}
                    range={range}
                    density="compact"
                    followReveal
                    idleReadout={<IdleReadout stats={stats} layout={layout} />}
                  />
                </div>
                <div className={cn(ROOMY_ONLY, mode === "calendar" && "w-[19rem]")}>
                  <WorkHeatmap
                    dailyMap={stats.dailyMap}
                    startDate={stats.start}
                    endDate={stats.end}
                    range={range}
                    followReveal
                    idleReadout={<IdleReadout stats={stats} layout={layout} />}
                  />
                </div>
                <div className="mt-2 hidden widget-h4:flex dash-stack:flex">
                  <HeatmapLegend />
                </div>
              </div>

              <dl
                className={cn(
                  layout.side,
                  "flex-col border-l border-border pl-4",
                  // Beside the calendar the figures take the room that is
                  // left; beside a trail they are held narrow, because every
                  // pixel they give back is another week on screen.
                  mode === "trail" ? "w-28 shrink-0" : "min-w-28 max-w-64 flex-1",
                )}
              >
                <Figures stats={stats} detail="side" />
              </dl>
            </div>

            <div className={layout.noSide}>
              <dl className="hidden grid-cols-3 gap-3 border-t border-border pt-3 widget-h4:grid dash-stack:grid">
                <Figures stats={stats} detail="row" />
              </dl>
            </div>
          </div>
        ) : (
          // Holds the stacked card's height through hydration, so the phone
          // layout does not jump when the grid arrives a paint later.
          <div className="h-36" aria-hidden />
        )}
      </WidgetBody>
    </>
  );
}

/**
 * The window, and the control that changes it, in one place.
 *
 * It sits where the header's `meta` goes — "Work Heatmap · 30D" — because it
 * *is* the meta: printing the window and then a second control showing the
 * same value would spend a narrow header saying it twice. A dropdown rather
 * than the Analytics page's tab strip for the same reason; five tabs do not
 * fit beside the title in a 230px box.
 *
 * The choice is view state, not a setting: it starts at the widget's saved
 * range and is not written back.
 */
function RangeSelect({
  range,
  onChange,
}: {
  range: RangeKey;
  onChange: (range: RangeKey) => void;
}) {
  const short = RANGE_OPTIONS.find((o) => o.key === range)?.label ?? range;
  return (
    <Select value={range} onValueChange={(v) => onChange(v as RangeKey)}>
      <SelectTrigger
        aria-label={`Window: ${RANGE_LONG_LABELS[range]}. Change window`}
        className="h-6 w-auto gap-0.5 rounded-md border-0 bg-transparent py-0 pl-1.5 pr-1 text-xs font-medium text-muted-foreground shadow-none hover:bg-surface-2 hover:text-foreground pointer-coarse:h-9 pointer-coarse:px-2.5 [&>svg]:h-3.5 [&>svg]:w-3.5"
      >
        <SelectValue>{short}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {RANGE_OPTIONS.map((opt) => (
          <SelectItem key={opt.key} value={opt.key}>
            {RANGE_LONG_LABELS[opt.key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function timeText(seconds: number) {
  return seconds > 0 ? formatDuration(seconds) : "0m";
}

/**
 * What the heatmap's readout line says while no day is being pointed at.
 *
 * An empty window says so and how to change that. Otherwise: where the box
 * has no room for figures, the essentials; where it has, the busiest day, as
 * on the Analytics page.
 */
function IdleReadout({
  stats,
  layout,
}: {
  stats: RangeStats;
  layout: (typeof LAYOUT)[HeatmapMode];
}) {
  if (stats.sessionCount === 0) {
    return (
      <>
        No work logged in this window.{" "}
        <Link
          href="/focus/new"
          className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
        >
          Start a session
        </Link>{" "}
        or log a past one to fill it in.
      </>
    );
  }

  const busiest = [...stats.dailyMap.entries()].reduce<[string, number] | null>(
    (best, entry) => (!best || entry[1] > best[1] ? entry : best),
    null,
  );

  return (
    <>
      <span className={cn("tabular-nums", layout.essentials)}>
        <span className="font-medium text-foreground">
          {stats.activeDays}/{stats.days}
        </span>{" "}
        days
        <span className="hidden @xs/widget:inline">
          {" · "}
          {stats.sessionCount} {stats.sessionCount === 1 ? "session" : "sessions"}
        </span>
        {" · "}
        {timeText(stats.totalSeconds)}
      </span>
      {busiest && (
        <span className={layout.busiest}>
          <span className="font-medium text-foreground">
            {format(parseDayKey(busiest[0]), "EEE d MMM")}
          </span>
          {" · "}
          {timeText(busiest[1])} · busiest day
        </span>
      )}
    </>
  );
}

/**
 * The figures beside (or under) the grid — every one read off the same
 * `RangeStats` the squares are drawn from.
 *
 * `row` is the three the mockup leads with. `side` adds tasks and the streak
 * once the box is four rows tall: more room shows more, not the same three
 * printed larger.
 */
function Figures({ stats, detail }: { stats: RangeStats; detail: "side" | "row" }) {
  // Each figure draws its own top rule (not `divide-y`): the ones hidden in a
  // short box would otherwise leave a stray line under the last one shown.
  const item =
    detail === "side"
      ? "border-t border-border py-1.5 first:border-t-0 first:pt-0"
      : "min-w-0";
  const extra = cn(item, "hidden widget-h4:block");

  return (
    <>
      <Figure className={item} label="Days worked">
        {stats.activeDays} / {stats.days}
      </Figure>
      <Figure className={item} label="Sessions">
        {stats.sessionCount}
      </Figure>
      <Figure className={item} label="Total time">
        {timeText(stats.totalSeconds)}
      </Figure>
      {detail === "side" && (
        <>
          <Figure className={extra} label="Tasks done">
            {stats.tasksCompleted}
          </Figure>
          <Figure className={extra} label="Longest streak">
            {stats.longestStreak} {stats.longestStreak === 1 ? "day" : "days"}
          </Figure>
          <Figure className={cn(item, "hidden widget-h5:block")} label="Most active">
            {stats.mostActiveDay ?? "—"}
          </Figure>
        </>
      )}
    </>
  );
}

function Figure({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="truncate text-[11px] leading-4 text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-semibold leading-5 tabular-nums">{children}</dd>
    </div>
  );
}
