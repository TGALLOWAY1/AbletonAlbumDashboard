"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { cn, formatDuration } from "@/lib/utils";
import type { RangeKey } from "@/lib/analytics";
import {
  INTENSITY_BANDS,
  buildHeatmapGrid,
  heatmapMode,
  type HeatmapDay,
} from "@/lib/heatmap";

const INTENSITY_CLASSES = [
  "bg-surface-2",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
] as const;

/** Mon→Sun. The grid is Monday-aligned, so index 0 is Monday everywhere. */
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** Which of those the compact gutter has room to print. */
const GUTTER_ROWS = new Set([0, 2, 4]);

/**
 * Cell geometry, as CSS custom properties.
 *
 * The invariant is that **cell size never depends on the range**. It used to:
 * each week column took `flex-1` of the card and `aspect-square` turned that
 * share into the row height, so the fewer columns a range had the bigger its
 * squares got — 504px at 7D on a 1080px card, 1.8px at 1Y on a phone, from
 * the same stylesheet. The weekday gutter, whose boxes were always 24px, then
 * lined up with those rows at no range at all.
 *
 * The two modes hold that invariant differently, and only the trail is fixed
 * in pixels:
 *
 *   - `trail` cells are exactly `--cell`, so a quarter and a year are drawn at
 *     the same scale and anything wider than the card scrolls.
 *   - `calendar` cells are a seventh of the container under a 30rem cap. That
 *     tracks the viewport — ~35px on the narrowest phone, 63px at the cap —
 *     but it is bounded at both ends and identical for 7D and 30D, which is
 *     the property that matters. A month calendar that refused to use a
 *     phone's width would be a worse calendar, not a more consistent one.
 *
 * Both modes read the same two variables, and every offset in the component —
 * row heights, the gutter, the month markers' left positions — is expressed in
 * them, so nothing can be sized against a stale assumption about the others.
 */
const TRAIL_VARS = "[--cell:11px] [--gap:3px] md:[--cell:14px]";
const CALENDAR_VARS = "[--gap:0.375rem]";

/**
 * The same two drawings at a size that fits a dashboard widget.
 *
 * `regular` is the Analytics page, where the heatmap is the page. A widget's
 * default box leaves it about 165px of height, and a 30-day calendar whose
 * squares are a seventh of the card is four times that. `compact` is the
 * answer, and it is opt-in so the page is untouched.
 *
 * It keeps the invariant above rather than trading it for a fit: compact
 * cells are *fixed* too — 16px on the calendar, 11px on the trail at every
 * viewport — so 7D and 30D, and 3M and 1Y, are still drawn at one scale and a
 * long trail still scrolls instead of shrinking. What a 16px square cannot
 * hold is a date, so the compact calendar prints none (ghost days outside the
 * window are left blank for the same reason) and relies on the readout line,
 * as the trail always has.
 */
export type HeatmapDensity = "regular" | "compact";

const TRAIL_COMPACT_VARS = "[--cell:11px] [--gap:3px]";
const CALENDAR_COMPACT_VARS = "[--cell:1rem] [--gap:3px]";
/** One letter per weekday: a 16px column has no room for "Mon". */
const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

function dayLabel(date: Date) {
  return format(date, "EEE d MMM");
}

function dayTitle(day: HeatmapDay) {
  const work = day.seconds > 0 ? formatDuration(day.seconds) : "no work logged";
  return `${dayLabel(day.date)} — ${work}`;
}

/**
 * The work heatmap.
 *
 * Two layouts behind one component, chosen by range (see `heatmapMode`):
 * `calendar` for 7D/30D, where there is room to print the date in every square
 * and no reason to make the reader hover to find out what they are looking at;
 * `trail` for 3M/6M/1Y, where the shape across months is the point and
 * individual dates are read off the month markers and the hover line instead.
 *
 * Both are one responsive surface — the dashboard has no desktop/mobile split
 * — so the difference between a phone and a monitor is cell size and, on the
 * trail, horizontal scroll. Neither reflows the grid into a different shape.
 */
export function WorkHeatmap({
  dailyMap,
  startDate,
  endDate,
  range,
  density = "regular",
  idleReadout,
  followReveal = false,
}: {
  dailyMap: Map<string, number>;
  startDate: Date;
  endDate: Date;
  range: RangeKey;
  /** `compact` for a dashboard widget's box — see `HeatmapDensity`. */
  density?: HeatmapDensity;
  /**
   * What the readout line says while no day is hovered or tapped. Left out,
   * it names the window's busiest day (or says the window is empty), as on
   * the Analytics page. A widget with no room for a row of figures puts its
   * essentials here instead, and its empty-window line.
   */
  idleReadout?: ReactNode;
  /**
   * Re-scroll the trail to today when the heatmap goes from hidden to shown.
   * A widget keeps a compact and a regular drawing mounted and lets CSS pick
   * by box size, so one of them is first laid out with no width at all.
   */
  followReveal?: boolean;
}) {
  const grid = useMemo(
    () => buildHeatmapGrid({ start: startDate, end: endDate, dailyMap }),
    [dailyMap, startDate, endDate],
  );
  const [hovered, setHovered] = useState<HeatmapDay | null>(null);

  const mode = heatmapMode(range);
  const compact = density === "compact";
  const shown =
    hovered ?? (idleReadout === undefined ? grid.busiest : null);

  return (
    <div className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2")}>
      {mode === "trail" ? (
        <TrailGrid
          grid={grid}
          range={range}
          onHover={setHovered}
          compact={compact}
          followReveal={followReveal}
        />
      ) : compact ? (
        <CompactCalendarGrid grid={grid} onHover={setHovered} />
      ) : (
        <CalendarGrid grid={grid} onHover={setHovered} />
      )}

      {/*
        The readout. On the trail there is no room to print dates in the
        squares, and a native `title` tooltip never appears on a touch screen —
        so the day under the pointer (or the last one tapped) is named here in
        full instead. It falls back to the window's heaviest day, which keeps
        the line useful before anyone interacts with it and stops the grid from
        shifting when they do.
      */}
      <p className="min-h-4 text-[11px] leading-4 text-muted-foreground">
        {shown ? (
          <>
            <span className="font-medium text-foreground">
              {dayLabel(shown.date)}
            </span>
            {" · "}
            {shown.seconds > 0 ? formatDuration(shown.seconds) : "no work logged"}
            {!hovered && shown.seconds > 0 ? " · busiest day" : ""}
          </>
        ) : (
          (idleReadout ?? "No work logged in this window.")
        )}
      </p>
    </div>
  );
}

/**
 * 7D and 30D: a calendar. Seven weekday columns, a week per row, the date in
 * every square.
 *
 * Capped in width because the cells are square: left to fill a 1080px card,
 * one month of work would be drawn as seven 150px tiles. The days on either
 * side of the window that complete the first and last week are drawn as
 * ghosts rather than dropped, so the rows stay weekday-aligned and the edge of
 * the window is visible rather than implied.
 */
function CalendarGrid({
  grid,
  onHover,
}: {
  grid: ReturnType<typeof buildHeatmapGrid>;
  onHover: (day: HeatmapDay | null) => void;
}) {
  return (
    <div
      className={cn("w-full max-w-[30rem]", CALENDAR_VARS)}
      onPointerLeave={() => onHover(null)}
    >
      <div
        className="grid grid-cols-7 gap-[var(--gap)] pb-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
        aria-hidden
      >
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div role="grid" aria-label="Work by day" className="flex flex-col gap-[var(--gap)]">
        {grid.weeks.map((week) => (
          <div key={week.index} role="row" className="grid grid-cols-7 gap-[var(--gap)]">
            {week.days.map((day) => (
              <CalendarCell key={day.key} day={day} onHover={onHover} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarCell({
  day,
  onHover,
}: {
  day: HeatmapDay;
  onHover: (day: HeatmapDay | null) => void;
}) {
  if (!day.inRange) {
    // Kept as a real cell rather than hidden: the row is a week, and a week
    // read out with five days in it is worse than one that says which two
    // fall outside the window.
    return (
      <div
        role="gridcell"
        aria-label={`${dayLabel(day.date)} — outside this window`}
        className="flex aspect-square items-center justify-center rounded-md text-[11px] tabular-nums text-muted-foreground/30"
      >
        {day.date.getDate()}
      </div>
    );
  }

  return (
    <div
      role="gridcell"
      aria-label={dayTitle(day)}
      title={dayTitle(day)}
      onPointerEnter={() => onHover(day)}
      onPointerDown={() => onHover(day)}
      className={cn(
        "flex aspect-square flex-col items-center justify-center rounded-md text-[11px] leading-none tabular-nums",
        INTENSITY_CLASSES[day.intensity],
        // Filled squares carry the primary colour, so the date on top of them
        // has to flip with the fill rather than staying muted-on-dark.
        day.intensity >= 3
          ? "font-medium text-primary-foreground"
          : "text-muted-foreground",
        day.isToday && "ring-1 ring-inset ring-foreground/40",
      )}
    >
      {/* The 1st names its month in place, so the grid never depends on a
          separate label row lining up with the right column. */}
      {day.isMonthStart ? (
        <span className="text-[9px] font-semibold uppercase tracking-wide">
          {format(day.date, "MMM")}
        </span>
      ) : null}
      <span>{day.date.getDate()}</span>
    </div>
  );
}

/**
 * 7D and 30D in a widget: the same calendar — seven weekday columns, a week
 * per row — at a fixed 16px a square.
 *
 * Not the regular grid scaled down: that one sizes its squares off the
 * container, and a container this small would make them a different size in
 * every box. Fixed cells keep a month the same picture wherever the widget is
 * put, and make its footprint (130px wide, at most 111px tall) something the
 * widget can lay figures out around.
 */
function CompactCalendarGrid({
  grid,
  onHover,
}: {
  grid: ReturnType<typeof buildHeatmapGrid>;
  onHover: (day: HeatmapDay | null) => void;
}) {
  const columns = "grid grid-cols-[repeat(7,var(--cell))] gap-[var(--gap)]";
  return (
    <div
      className={cn("w-max", CALENDAR_COMPACT_VARS)}
      onPointerLeave={() => onHover(null)}
    >
      <div
        className={cn(
          columns,
          "pb-[var(--gap)] text-center text-[9px] font-medium leading-none text-muted-foreground",
        )}
        aria-hidden
      >
        {WEEKDAY_INITIALS.map((d, i) => (
          <div key={WEEKDAYS[i]}>{d}</div>
        ))}
      </div>

      <div role="grid" aria-label="Work by day" className="flex flex-col gap-[var(--gap)]">
        {grid.weeks.map((week) => (
          <div key={week.index} role="row" className={columns}>
            {week.days.map((day) =>
              day.inRange ? (
                <div
                  key={day.key}
                  role="gridcell"
                  aria-label={dayTitle(day)}
                  title={dayTitle(day)}
                  onPointerEnter={() => onHover(day)}
                  onPointerDown={() => onHover(day)}
                  className={cn(
                    "h-[var(--cell)] w-[var(--cell)] rounded-[3px]",
                    INTENSITY_CLASSES[day.intensity],
                    day.isToday && "ring-1 ring-inset ring-foreground/40",
                  )}
                />
              ) : (
                <div
                  key={day.key}
                  role="gridcell"
                  aria-label={`${dayLabel(day.date)} — outside this window`}
                  className="h-[var(--cell)] w-[var(--cell)]"
                />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 3M, 6M and 1Y: a week per column, a weekday per row.
 *
 * The gutter sits outside the scroll container so the weekday names stay put
 * while a year of columns scrolls under them, and both sides are laid out with
 * the same `--cell`/`--gap` values, which is what keeps row `n` of the gutter
 * level with row `n` of the grid at every size.
 */
function TrailGrid({
  grid,
  range,
  onHover,
  compact = false,
  followReveal = false,
}: {
  grid: ReturnType<typeof buildHeatmapGrid>;
  range: RangeKey;
  onHover: (day: HeatmapDay | null) => void;
  compact?: boolean;
  followReveal?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  // A window that ends today should open showing today. Only matters when the
  // grid is wider than the card, which on a phone is every trail range.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;

    // Laid out while `display: none`, there is no width to scroll, so the
    // line above does nothing; do it again the moment the trail is shown.
    if (!followReveal || typeof ResizeObserver === "undefined") return;
    let wasHidden = el.clientWidth === 0;
    const observer = new ResizeObserver(() => {
      const hidden = el.clientWidth === 0;
      if (wasHidden && !hidden) el.scrollLeft = el.scrollWidth;
      wasHidden = hidden;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [range, grid.weeks.length, followReveal]);

  // The label size steps up with the cell on the regular trail; the compact
  // one holds both, so the gutter still lines up with 11px rows on a desktop.
  const labelSize = compact ? "text-[9px]" : "text-[9px] md:text-[10px]";

  return (
    <div
      className={cn(
        "flex gap-[var(--gap)]",
        compact ? TRAIL_COMPACT_VARS : TRAIL_VARS,
      )}
      onPointerLeave={() => onHover(null)}
    >
      <div
        className={cn(
          "flex shrink-0 flex-col gap-[var(--gap)] leading-none text-muted-foreground",
          labelSize,
        )}
        aria-hidden
      >
        {/* Reserves the month-label row, so the first weekday lines up with
            the first grid row rather than with the labels above it. */}
        <div className="h-4" />
        {WEEKDAYS.map((label, i) => (
          <div key={label} className="flex h-[var(--cell)] items-center">
            {GUTTER_ROWS.has(i) ? label : ""}
          </div>
        ))}
      </div>

      <div ref={scroller} className="min-w-0 flex-1 overflow-x-auto pb-1">
        <div className="flex w-max flex-col gap-[var(--gap)]">
          {/*
            Month markers are absolutely positioned at their week column's own
            offset — `(cell + gap) × column`, the exact arithmetic the grid
            below is drawn with. They used to be a parallel flex row dividing a
            slightly different width, which drifted, and to be placed by the
            month of each column's Monday, which named the column *after* the
            one a mid-week month actually started in.

            Multiplying a length by a unitless number is CSS Values 3 `calc()`,
            supported everywhere this app runs; measured in a browser, each
            label resolves to an exact pixel offset and lands 0px from the
            column holding its 1st.
          */}
          <div className="relative h-4">
            {grid.monthMarkers.map((marker) => (
              <div
                key={marker.key}
                className="absolute top-0 flex flex-col items-start"
                style={{
                  left: `calc((var(--cell) + var(--gap)) * ${marker.column})`,
                }}
              >
                <span
                  className={cn(
                    "leading-none text-muted-foreground",
                    labelSize,
                  )}
                >
                  {marker.label}
                </span>
                {/* Ties the word to the column edge it names. */}
                <span className="mt-0.5 h-1 w-px bg-border" />
              </div>
            ))}
          </div>

          <div role="grid" aria-label="Work by day" className="flex gap-[var(--gap)]">
            {grid.weeks.map((week) => (
              <div
                key={week.index}
                role="row"
                className="flex flex-col gap-[var(--gap)]"
              >
                {week.days.map((day) =>
                  day.inRange ? (
                    <div
                      key={day.key}
                      role="gridcell"
                      aria-label={dayTitle(day)}
                      title={dayTitle(day)}
                      onPointerEnter={() => onHover(day)}
                      onPointerDown={() => onHover(day)}
                      className={cn(
                        "h-[var(--cell)] w-[var(--cell)] rounded-[2px]",
                        INTENSITY_CLASSES[day.intensity],
                        day.isToday && "ring-1 ring-inset ring-foreground/40",
                      )}
                    />
                  ) : (
                    <div
                      key={day.key}
                      role="gridcell"
                      aria-label={`${dayLabel(day.date)} — outside this window`}
                      className="h-[var(--cell)] w-[var(--cell)]"
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <span>Less</span>
      {INTENSITY_CLASSES.map((cls, i) => (
        <span
          key={i}
          title={INTENSITY_BANDS[i]}
          aria-label={INTENSITY_BANDS[i]}
          className={cn("h-3 w-3 rounded-[2px]", cls)}
        />
      ))}
      <span>More</span>
    </div>
  );
}
