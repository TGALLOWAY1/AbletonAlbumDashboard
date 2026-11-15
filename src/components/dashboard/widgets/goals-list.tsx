"use client";

import { useMemo } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Headphones,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { WidgetBody, WidgetHeader } from "@/components/dashboard/widget-parts";
import type { AnalyticsSession, AnalyticsTaskCompletion } from "@/lib/analytics";
import type { Goal, GoalMetric } from "@/lib/dashboard/widgets";
import { daysLeftText, goalLabel, goalsProgress, type GoalProgress } from "@/lib/goals";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";

const METRIC_ICONS: Record<GoalMetric, LucideIcon> = {
  sessions: Headphones,
  minutes: Clock,
  tasks: ListChecks,
  days: CalendarDays,
};

export function GoalsList({
  title,
  goals,
  sessions,
  taskCompletions,
}: {
  title: string;
  goals: Goal[];
  sessions: AnalyticsSession[];
  taskCompletions: AnalyticsTaskCompletion[];
}) {
  // "This week" starts on the reader's Monday, so nothing is measured until
  // the browser is rendering — see `useIsClient`. The rows are drawn straight
  // away with their labels; only the counts and the bars wait.
  //
  // The clock is read *inside* the memo, with the series as its inputs, not
  // once at mount: the window runs to now, so a mount-time "now" would shut
  // out everything logged afterwards. Ticking a task revalidates the
  // dashboard and hands this still-mounted component a fresh series;
  // re-reading the clock along with it is what lets that task count without
  // a reload.
  const isClient = useIsClient();
  const progress = useMemo(
    () =>
      isClient
        ? goalsProgress({ goals, sessions, tasks: taskCompletions, now: new Date() })
        : null,
    [isClient, goals, sessions, taskCompletions],
  );
  const met = progress?.filter((p) => p.done).length;

  return (
    <>
      <WidgetHeader
        title={title}
        meta={
          progress && (
            <span className="tabular-nums">
              {met} of {progress.length} met
            </span>
          )
        }
      />
      <WidgetBody>
        {/* Tight rows in the two-row box, so the default three goals fit it
            without scrolling; roomier ones wherever there is height. */}
        <ul className="flex flex-col gap-[5px] widget-h3:gap-3 dash-stack:gap-3.5">
          {goals.map((goal, i) => (
            <GoalRow
              // Goals have no id and two may be identical; position is the key.
              key={i}
              goal={goal}
              progress={progress?.[i] ?? null}
            />
          ))}
        </ul>
      </WidgetBody>
    </>
  );
}

/**
 * "2 / 3", with a tick once the goal is met — so met is a mark and a word
 * for screen readers, not just a bar that happens to be full.
 */
function GoalValue({
  progress,
  className,
}: {
  progress: GoalProgress | null;
  className?: string;
}) {
  const done = progress?.done ?? false;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 tabular-nums",
        done ? "font-semibold" : "font-medium",
        className,
      )}
    >
      {done && (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="sr-only">Met:</span>
        </>
      )}
      {progress?.valueText ?? " "}
    </span>
  );
}

function GoalRow({ goal, progress }: { goal: Goal; progress: GoalProgress | null }) {
  const Icon = METRIC_ICONS[goal.metric];
  const done = progress?.done ?? false;

  return (
    <li className="flex items-center gap-2 widget-h3:gap-3 dash-stack:gap-3">
      <span
        aria-hidden
        className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary widget-h3:flex dash-stack:flex"
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs leading-[18px] widget-h3:text-sm widget-h3:leading-5 dash-stack:text-sm dash-stack:leading-5">
          <Icon
            aria-hidden
            className="h-3.5 w-3.5 shrink-0 text-primary widget-h3:hidden dash-stack:hidden"
          />
          <span className="min-w-0 flex-1 truncate">{goalLabel(goal)}</span>

          {/* More room, more said: what is left and how long there is. */}
          {progress && (
            <span className="hidden shrink-0 text-xs text-muted-foreground @md/widget:inline">
              {done
                ? "Goal met"
                : `${progress.remainingText} · ${daysLeftText(progress.window)}`}
            </span>
          )}

          {/* Beside the label — except in a narrow box with room to be
              taller, where it moves down to the meter's line (below) so the
              label can keep its "this week". */}
          <GoalValue
            progress={progress}
            className="@max-xs/widget:widget-h3:hidden"
          />
        </div>

        <div className="mt-0.5 flex items-center gap-2 widget-h3:mt-1 dash-stack:mt-1">
          {/* The meter: the track is a lighter step of the fill's own green. */}
          <div
            aria-hidden
            className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-primary/15 widget-h3:h-1.5 dash-stack:h-1.5"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${(progress?.fraction ?? 0) * 100}%` }}
            />
          </div>
          <GoalValue
            progress={progress}
            className="hidden text-xs @max-xs/widget:widget-h3:flex"
          />
        </div>
      </div>
    </li>
  );
}
