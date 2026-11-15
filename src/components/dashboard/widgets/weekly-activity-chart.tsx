"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { WidgetBody, WidgetHeader } from "@/components/dashboard/widget-parts";
import type { AnalyticsSession } from "@/lib/analytics";
import { useIsClient } from "@/lib/use-is-client";
import { cn, formatDuration } from "@/lib/utils";
import {
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  buildWeekActivity,
  formatTick,
  type WeekActivity,
  type WeekDay,
} from "@/lib/weekly-activity";

function timeText(seconds: number) {
  return seconds > 0 ? formatDuration(seconds) : "0m";
}

/** What a day's bar stands for, in words — the tooltip and the table share it. */
function dayValueText(day: WeekDay) {
  if (day.isFuture) return "not yet";
  return day.seconds > 0 ? formatDuration(day.seconds) : "no work logged";
}

/**
 * Days that have not happened are hatched, not empty. An empty slot beside
 * six bars reads as a day off; the hatch reads as "this is not a zero". Drawn
 * at 135° in the border colour so it stays quieter than any bar.
 */
const PENDING_HATCH = {
  backgroundImage:
    "repeating-linear-gradient(135deg, var(--color-border) 0 1.5px, transparent 1.5px 6px)",
};

export function WeeklyActivityChart({
  title,
  sessions,
}: {
  title: string;
  sessions: AnalyticsSession[];
}) {
  // Which Monday starts the week is the reader's calendar, so the model is
  // not built until the browser is rendering — see `useIsClient`.
  //
  // The series is a dependency on purpose: the week runs *to now*, so a clock
  // read once at mount would shut out a session logged afterwards. Logging
  // one revalidates the dashboard and hands this still-mounted chart a fresh
  // series; re-reading the clock with it is what draws that session's bar
  // without a reload.
  const isClient = useIsClient();
  const now = useMemo(
    () => (isClient ? new Date() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
    [isClient, sessions],
  );
  const week = useMemo(
    () => (now ? buildWeekActivity({ sessions, now }) : null),
    [sessions, now],
  );

  return (
    <>
      <WidgetHeader
        title={title}
        meta={
          week && (
            <span className="tabular-nums" title="Time logged this week">
              {timeText(week.totalSeconds)}
            </span>
          )
        }
      />
      <WidgetBody scroll={false}>
        {week ? (
          <WeekChart week={week} />
        ) : (
          // Holds the stacked card's height through hydration.
          <div className="h-36" aria-hidden />
        )}
      </WidgetBody>
    </>
  );
}

function WeekChart({ week }: { week: WeekActivity }) {
  const [active, setActive] = useState<string | null>(null);
  const empty = week.totalSeconds === 0;

  // With nothing pointed at, one bar is labelled: today's if it has time on
  // it, otherwise the week's heaviest. One label, not seven — the axis and
  // the hover carry the rest.
  const today = week.days.find((d) => d.isToday);
  const labelled = active ?? (today && today.seconds > 0 ? today.key : week.busiest?.key);

  // Arrow keys walk the days, so the per-bar value is not pointer-only.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const from = week.days.findIndex((d) => d.key === (active ?? today?.key));
    const step = e.key === "ArrowRight" ? 1 : -1;
    const next = Math.min(6, Math.max(0, (from < 0 ? 0 : from) + step));
    setActive(week.days[next].key);
  };

  return (
    // Fills a gridded box exactly (the body does not scroll); stacked on a
    // phone there is no box height to fill, so the chart names its own.
    <div className="flex h-full min-h-0 gap-5 dash-stack:h-40">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 gap-1.5 pt-4">
          {/* Hour labels: only where the plot is tall enough to space them. */}
          <div
            className="relative hidden w-5 shrink-0 text-[10px] tabular-nums text-muted-foreground widget-h3:block dash-stack:block"
            aria-hidden
          >
            {week.scale.ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-0 -translate-y-1/2 leading-none"
                style={{ top: `${100 - (tick / week.scale.maxSeconds) * 100}%` }}
              >
                {formatTick(tick)}
              </span>
            ))}
          </div>

          <div
            className="relative min-w-0 flex-1"
            onPointerLeave={() => setActive(null)}
          >
            {/* Gridlines. The baseline is always drawn; the hour lines join it
                with the labels. */}
            {week.scale.ticks.map((tick) => (
              <span
                key={tick}
                aria-hidden
                className={cn(
                  "absolute inset-x-0 border-t border-border",
                  tick > 0 && "hidden widget-h3:block dash-stack:block",
                )}
                style={{ top: `${100 - (tick / week.scale.maxSeconds) * 100}%` }}
              />
            ))}

            {/* One focus stop for the whole plot; the arrow keys do the rest.
                Assistive tech gets the summary here and the table below. */}
            <div
              role="img"
              tabIndex={0}
              aria-label={
                empty
                  ? "Bar chart of time logged each day this week. Nothing logged yet."
                  : `Bar chart of time logged each day this week. ${timeText(week.totalSeconds)} in total. The same figures follow as a table.`
              }
              className="absolute inset-0 flex rounded-sm"
              onKeyDown={onKeyDown}
              onBlur={() => setActive(null)}
            >
              {week.days.map((day) => (
                <DayColumn
                  key={day.key}
                  day={day}
                  max={week.scale.maxSeconds}
                  active={active === day.key}
                  labelled={labelled === day.key}
                  pinned={active !== null}
                  onActive={setActive}
                />
              ))}
            </div>

            {empty && (
              <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-2 text-center text-xs text-muted-foreground">
                Nothing logged this week yet.
                <span className="hidden widget-h3:inline dash-stack:inline">
                  {" "}
                  <Link
                    href="/focus/new"
                    className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                  >
                    Start a session
                  </Link>{" "}
                  to draw the first bar.
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Day names, under their columns. The spacer matches the hour-label
            gutter above so the two rows share column edges. */}
        <div className="mt-1 flex gap-1.5" aria-hidden>
          <div className="hidden w-5 shrink-0 widget-h3:block dash-stack:block" />
          <div className="flex min-w-0 flex-1">
            {week.days.map((day) => (
              <div key={day.key} className="flex min-w-0 flex-1 justify-center">
                <span
                  className={cn(
                    "border-b-2 border-transparent text-[10px] leading-[14px]",
                    day.isToday
                      ? "border-primary font-semibold text-foreground"
                      : day.isFuture
                        ? "text-muted-foreground/60"
                        : "text-muted-foreground",
                  )}
                >
                  {WEEKDAY_SHORT[day.weekday]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* The table view: every value the chart shows, without the chart. */}
        <table className="sr-only">
          <caption>Time logged each day this week</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Time logged</th>
            </tr>
          </thead>
          <tbody>
            {week.days.map((day) => (
              <tr key={day.key}>
                <th scope="row">
                  {WEEKDAY_LONG[day.weekday]}
                  {day.isToday ? " (today)" : ""}
                </th>
                <td>{dayValueText(day)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* A wide box has room to say what the bars add up to. */}
      <dl className="hidden w-32 shrink-0 flex-col justify-center gap-2 border-l border-border pl-5 @lg/widget:flex">
        <SideFigure label="Days worked">
          {week.activeDays} / 7
        </SideFigure>
        <SideFigure label="Busiest day">
          {week.busiest
            ? `${WEEKDAY_SHORT[week.busiest.weekday]} · ${formatDuration(week.busiest.seconds)}`
            : "—"}
        </SideFigure>
        <SideFigure label="Per day worked" className="hidden widget-h3:block">
          {week.activeDays > 0
            ? formatDuration(week.totalSeconds / week.activeDays)
            : "—"}
        </SideFigure>
      </dl>
    </div>
  );
}

function DayColumn({
  day,
  max,
  active,
  labelled,
  pinned,
  onActive,
}: {
  day: WeekDay;
  max: number;
  active: boolean;
  /** This is the one bar whose value is printed above it. */
  labelled: boolean;
  /** The label is there because the reader asked, not by default. */
  pinned: boolean;
  onActive: (key: string) => void;
}) {
  const percent = Math.min(100, (day.seconds / max) * 100);

  return (
    // The whole column is the hit target — a 20-minute bar is a sliver.
    <div
      className="relative flex h-full min-w-0 flex-1 items-end justify-center px-0.5"
      onPointerEnter={() => onActive(day.key)}
      onPointerDown={() => onActive(day.key)}
      title={`${WEEKDAY_LONG[day.weekday]} — ${dayValueText(day)}`}
    >
      {day.isFuture ? (
        <div
          className="h-full w-full max-w-6 rounded-t-[4px] opacity-70"
          style={PENDING_HATCH}
        />
      ) : (
        <div
          className={cn(
            "w-full max-w-6 rounded-t-[4px]",
            day.seconds === 0
              ? // A day that happened with nothing on it: a stub on the
                // baseline, so it is a visible zero rather than a gap.
                "bg-muted-foreground/25"
              : day.isToday
                ? "bg-primary"
                : "bg-primary/45",
            active && day.seconds > 0 && "ring-2 ring-primary/30",
          )}
          style={{ height: day.seconds === 0 ? 2 : `max(3px, ${percent}%)` }}
        />
      )}

      {labelled && (
        <span
          className={cn(
            "pointer-events-none absolute left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium leading-none tabular-nums text-foreground",
            // By default the label only appears where the plot has headroom;
            // asked for (hover, tap, arrow keys) it shows in any box.
            !pinned && "hidden widget-h3:block dash-stack:block",
          )}
          style={{ bottom: day.isFuture ? "0%" : `${percent}%` }}
        >
          {day.isFuture ? "not yet" : timeText(day.seconds)}
        </span>
      )}
    </div>
  );
}

function SideFigure({
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
