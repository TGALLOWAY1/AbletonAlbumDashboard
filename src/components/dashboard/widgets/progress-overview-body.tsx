"use client";

import { useMemo } from "react";
import { CalendarCheck, CheckCircle2, Clock, Disc3, type LucideIcon } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  RANGE_LONG_LABELS,
  getRangeStats,
  type AnalyticsSession,
  type AnalyticsTaskCompletion,
  type RangeKey,
} from "@/lib/analytics";
import { useIsClient } from "@/lib/use-is-client";
import { cn, formatDuration } from "@/lib/utils";

/**
 * "Big" is the arrangement with the large ring: a narrow box four rows tall
 * (ring above the figures) or a wide one three rows tall (ring beside them).
 * Everything else — two rows, or stacked on a phone — keeps the small ring
 * with its caption alongside. Tailwind has to see whole class names, so each
 * rule is written once per condition.
 */
const RING_BLOCK =
  "flex shrink-0 items-center gap-3 widget-h4:flex-col widget-h4:gap-1.5 widget-h4:text-center @md/widget:widget-h3:flex-col @md/widget:widget-h3:gap-1.5 @md/widget:widget-h3:text-center";
const SMALL_ONLY = "widget-h4:hidden @md/widget:widget-h3:hidden";
const BIG_ONLY = "hidden widget-h4:block @md/widget:widget-h3:block";


export function ProgressOverviewBody({
  percent,
  trackCount,
  range,
  sessions,
  taskCompletions,
}: {
  percent: number;
  trackCount: number;
  range: RangeKey;
  sessions: AnalyticsSession[];
  taskCompletions: AnalyticsTaskCompletion[];
}) {
  // The window is the reader's calendar, so it waits for the browser — see
  // `useIsClient`. Until then the figures hold their space with no value.
  const isClient = useIsClient();
  const now = useMemo(() => (isClient ? new Date() : null), [isClient]);
  const stats = useMemo(
    () =>
      now ? getRangeStats({ sessions, tasks: taskCompletions, range, now }) : null,
    [sessions, taskCompletions, range, now],
  );

  const tracks = `${trackCount} active ${trackCount === 1 ? "track" : "tracks"}`;
  const time = stats ? (stats.totalSeconds > 0 ? formatDuration(stats.totalSeconds) : "0m") : null;
  const window = RANGE_LONG_LABELS[range].toLowerCase();

  return (
    // `min-h-full` + centring, not `h-full`: when the content is taller than
    // the box it grows and the body scrolls, instead of being centred out of
    // reach above the top edge.
    <div className="flex min-h-full flex-col justify-center gap-3 @md/widget:flex-row @md/widget:items-center @md/widget:justify-start @md/widget:gap-6">
      <div className={RING_BLOCK}>
        <div
          role="img"
          aria-label={`Overall progress ${percent}%: the average across ${tracks}`}
          className="shrink-0"
        >
          <div className={SMALL_ONLY}>
            <ProgressRing value={percent} size={64} stroke={7} labelClassName="text-sm" />
          </div>
          <div className={BIG_ONLY}>
            <div className="relative">
              <ProgressRing value={percent} size={108} stroke={10} showLabel={false} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold leading-7">{percent}%</span>
                <span className="text-[11px] leading-4 text-muted-foreground">Overall</span>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className={cn("text-sm font-medium", SMALL_ONLY)}>Overall</p>
          {/* What the percentage is, in words, at every size. */}
          <p className="text-xs text-muted-foreground widget-h4:text-[11px] @md/widget:widget-h3:text-[11px]">
            Average of {tracks}
          </p>
          {/* The smallest box has no figures, so it gets one of them as a line. */}
          <p className="text-xs text-muted-foreground widget-h3:hidden dash-stack:hidden @md/widget:hidden">
            {time ? (
              <>
                <span className="font-medium text-foreground tabular-nums">{time}</span> in the{" "}
                {window}
              </>
            ) : (
              " "
            )}
          </p>
        </div>
      </div>

      <dl
        aria-label={`Over the ${window}`}
        // Two columns of label-over-value; beside the large ring in a wide box,
        // one column of rows with icons instead.
        className="hidden min-w-0 grid-cols-2 gap-x-4 gap-y-2 widget-h3:grid dash-stack:grid @md/widget:grid @md/widget:max-w-60 @md/widget:flex-1 @md/widget:widget-h3:grid-cols-1 @md/widget:widget-h3:gap-y-0"
      >
        <Figure icon={CheckCircle2} label="Tasks done">
          {stats?.tasksCompleted}
        </Figure>
        <Figure icon={Clock} label="Time logged">
          {time}
        </Figure>
        <Figure icon={CalendarCheck} label="Days worked">
          {stats && `${stats.activeDays} / ${stats.days}`}
        </Figure>
        {/* A count of what is open now, not something measured over the window. */}
        <Figure icon={Disc3} label="Tracks active">
          {trackCount}
        </Figure>
      </dl>
    </div>
  );
}

/**
 * One figure. A label over its value by default; in the wide arrangement a
 * row — icon, label, value at the right edge — as in the design reference.
 */
function Figure({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-w-0 flex-col @md/widget:widget-h3:h-7 @md/widget:widget-h3:flex-row @md/widget:widget-h3:items-center @md/widget:widget-h3:gap-2"
    >
      <Icon
        className="hidden h-4 w-4 shrink-0 text-primary @md/widget:widget-h3:block"
        aria-hidden
      />
      <dt className="truncate text-[11px] leading-4 text-muted-foreground @md/widget:widget-h3:flex-1 @md/widget:widget-h3:text-xs">
        {label}
      </dt>
      <dd className="truncate text-sm font-semibold leading-5 tabular-nums">
        {children ?? " "}
      </dd>
    </div>
  );
}
