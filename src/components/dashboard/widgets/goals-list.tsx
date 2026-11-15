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
  // The series are dependencies on purpose: the window runs *to now*, so a
  // clock read once at mount would shut out everything logged afterwards.
  // Ticking a task revalidates the dashboard and hands this still-mounted
  // component a fresh series; re-reading the clock with it is what lets that
  // task count without a reload.
  const isClient = useIsClient();
  const now = useMemo(
    () => (isClient ? new Date() : null),
    [isClient, sessions, taskCompletions],
  );
  const progress = useMemo(
    () =>
      now ? goalsProgress({ goals, sessions, tasks: taskCompletions, now }) : null,
    [goals, sessions, taskCompletions, now],
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

          <span
            className={cn(
              "flex shrink-0 items-center gap-1 tabular-nums",
              done ? "font-semibold" : "font-medium",
            )}
          >
            {/* Met is a tick and a word for screen readers, not just a full,
                green bar. */}
            {done && (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
                <span className="sr-only">Met:</span>
              </>
            )}
            {progress?.valueText ?? " "}
          </span>
        </div>

        {/* The meter: the track is a lighter step of the fill's own green. */}
        <div
          aria-hidden
          className="mt-0.5 h-[3px] overflow-hidden rounded-full bg-primary/15 widget-h3:mt-1 widget-h3:h-1.5 dash-stack:mt-1 dash-stack:h-1.5"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${(progress?.fraction ?? 0) * 100}%` }}
          />
        </div>
      </div>
    </li>
  );
}
