"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  LEARNING_INTENSITY_BANDS,
  type ActivityDay,
  type ActivityStrip,
} from "@/lib/learning-activity";

/**
 * The five shades, deliberately the same ramp the work heatmap uses
 * (`INTENSITY_CLASSES` in work-heatmap.tsx) so the dashboard's grid and this
 * strip read as one system rather than two green things. They are not imported
 * from there because they mean different units — steps of *minutes worked*
 * against steps of *resources learned* — and a shared constant would invite a
 * change to one to be made on behalf of the other.
 */
const INTENSITY_CLASSES = [
  "bg-surface-2",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
] as const;

/**
 * Cell geometry, as CSS custom properties — and the same invariant the work
 * heatmap is built around: **a cell's size never depends on the range**. A
 * week and a year are drawn at the same scale, and a strip wider than its card
 * scrolls rather than squeezing. See the note at the top of
 * src/lib/heatmap.ts for what happens when it does not.
 */
const STRIP_VARS = "[--cell:14px] [--gap:4px] md:[--cell:18px]";

function dayLabel(date: Date) {
  return format(date, "EEE d MMM");
}

function countLabel(count: number) {
  if (count === 0) return "nothing learned";
  return `${count} learned`;
}

function dayTitle(day: ActivityDay) {
  return `${dayLabel(day.date)} — ${countLabel(day.count)}`;
}

/**
 * One row of days, oldest on the left, shaded by how many resources were
 * archived on each.
 *
 * A strip rather than the dashboard's week grid because this answers a
 * different question. The work heatmap is about the shape of a week — which
 * weekdays you actually produce on — and needs weekday rows to show it.
 * Learning is about the run: whether the habit held. A single line of days is
 * how a habit tracker draws that, and it is what the reference this was built
 * from does.
 *
 * The hovered (or last tapped) day is named in the readout line below rather
 * than in a `title` tooltip, because a tooltip never fires on a touch screen —
 * the same reason the work heatmap's trail carries one.
 */
export function LearningActivityMap({
  strip,
  emptyMessage = "Nothing learned in this window. Archive a resource once you've used it and it lands here.",
  showReadout = true,
}: {
  strip: ActivityStrip;
  emptyMessage?: string;
  /**
   * The By Category view stacks one of these per category and sets this false:
   * five readout lines saying much the same thing is repetition, and each row
   * already prints its own count beside its name.
   */
  showReadout?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<ActivityDay | null>(null);

  // A window that ends today should open showing today. Only matters when the
  // strip is wider than its card, which for a year is every viewport.
  const dayCount = strip.days.length;
  const startTime = strip.start.getTime();
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [dayCount, startTime]);

  const shown = hovered ?? strip.busiest;

  return (
    <div
      className={cn("flex flex-col gap-2", STRIP_VARS)}
      onPointerLeave={() => setHovered(null)}
    >
      <div ref={scroller} className="min-w-0 overflow-x-auto pb-1">
        <div className="flex w-max flex-col gap-[var(--gap)]">
          {/*
            Month markers sit at their own day column's offset —
            `(cell + gap) x column`, the exact arithmetic the row below is
            drawn with — so a label cannot drift off the square it names.
          */}
          <div className="relative h-4">
            {strip.monthMarkers.map((marker) => (
              <div
                key={marker.key}
                className="absolute top-0 flex flex-col items-start"
                style={{
                  left: `calc((var(--cell) + var(--gap)) * ${marker.column})`,
                }}
              >
                <span className="text-[9px] leading-none text-muted-foreground md:text-[10px]">
                  {marker.label}
                </span>
                <span className="mt-0.5 h-1 w-px bg-border" />
              </div>
            ))}
          </div>

          <div
            role="row"
            aria-label="Resources learned by day"
            className="flex gap-[var(--gap)]"
          >
            {strip.days.map((day) => (
              <div
                key={day.key}
                role="gridcell"
                aria-label={dayTitle(day)}
                title={dayTitle(day)}
                onPointerEnter={() => setHovered(day)}
                onPointerDown={() => setHovered(day)}
                className={cn(
                  "h-[var(--cell)] w-[var(--cell)] shrink-0 rounded-[3px]",
                  INTENSITY_CLASSES[day.intensity],
                  day.isToday && "ring-1 ring-inset ring-foreground/40",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {showReadout && (
        <p className="min-h-4 text-[11px] leading-4 text-muted-foreground">
          {strip.total === 0 ? (
            emptyMessage
          ) : shown ? (
            <>
              <span className="font-medium text-foreground">
                {dayLabel(shown.date)}
              </span>
              {" · "}
              {countLabel(shown.count)}
              {!hovered && shown.count > 0 ? " · best day" : ""}
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}

/** Low → High, the reference's wording: a scale, not a set of categories. */
export function LearningActivityLegend() {
  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <span>Low</span>
      {INTENSITY_CLASSES.map((cls, i) => (
        <span
          key={i}
          title={LEARNING_INTENSITY_BANDS[i]}
          aria-label={LEARNING_INTENSITY_BANDS[i]}
          className={cn("h-3 w-3 rounded-[2px]", cls)}
        />
      ))}
      <span>High</span>
    </div>
  );
}
