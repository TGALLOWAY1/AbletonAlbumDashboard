"use client";

import { useMemo } from "react";
import { addDays, format, isSameDay, isToday } from "date-fns";
import { SessionBlock } from "./session-block";
import {
  CALENDAR_DAY_END_HOUR,
  CALENDAR_DAY_START_HOUR,
  CALENDAR_HOUR_HEIGHT_PX,
  weekDays,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { CalendarSessionRow } from "@/lib/types";

const HOUR_RANGE = Array.from(
  { length: CALENDAR_DAY_END_HOUR - CALENDAR_DAY_START_HOUR },
  (_, i) => CALENDAR_DAY_START_HOUR + i,
);

export function WeekView({
  weekStart,
  sessions,
  onCreateSlot,
  onSelectSession,
}: {
  weekStart: Date;
  sessions: CalendarSessionRow[];
  onCreateSlot: (start: Date, end: Date) => void;
  onSelectSession: (session: CalendarSessionRow) => void;
}) {
  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, CalendarSessionRow[]>();
    sessions.forEach((s) => {
      const start = s.planned_start ?? s.started_at;
      if (!start) return;
      const key = format(new Date(start), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    });
    return map;
  }, [sessions]);

  const totalHeight =
    (CALENDAR_DAY_END_HOUR - CALENDAR_DAY_START_HOUR) *
    CALENDAR_HOUR_HEIGHT_PX;

  const handleColumnClick = (day: Date, ev: React.MouseEvent) => {
    const target = ev.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const offsetY = ev.clientY - rect.top;
    const hourFrac = offsetY / CALENDAR_HOUR_HEIGHT_PX;
    const totalMinutes = (CALENDAR_DAY_START_HOUR + hourFrac) * 60;
    const snapped = Math.round(totalMinutes / 30) * 30;
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    start.setMinutes(snapped);
    const end = new Date(start.getTime() + 60 * 60_000);
    onCreateSlot(start, end);
  };

  return (
    <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
      <div
        className="grid min-w-[840px] border border-border bg-surface"
        style={{ gridTemplateColumns: "60px repeat(7, minmax(110px, 1fr))" }}
      >
        <div className="border-b border-r border-border bg-surface-2 px-2 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          Hour
        </div>
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "border-b border-r border-border bg-surface-2 px-2 py-2 text-center text-xs",
              isToday(day) && "bg-primary/10 text-primary",
            )}
          >
            <div className="font-medium uppercase tracking-wide">
              {format(day, "EEE")}
            </div>
            <div className="text-base">{format(day, "d")}</div>
          </div>
        ))}

        <div className="relative border-r border-border" style={{ height: totalHeight }}>
          {HOUR_RANGE.map((hour) => (
            <div
              key={hour}
              className="border-b border-border/40 px-1.5 pt-0.5 text-[10px] text-muted-foreground"
              style={{ height: CALENDAR_HOUR_HEIGHT_PX }}
            >
              {formatHourLabel(hour)}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const items = sessionsByDay.get(dayKey) ?? [];
          return (
            <div
              key={day.toISOString()}
              className="relative border-r border-border"
              style={{ height: totalHeight }}
              onClick={(e) => handleColumnClick(day, e)}
            >
              {HOUR_RANGE.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-border/40 hover:bg-surface-2/50"
                  style={{ height: CALENDAR_HOUR_HEIGHT_PX }}
                />
              ))}
              {items.map((s) => {
                const start = new Date(s.planned_start ?? s.started_at!);
                const end = new Date(
                  s.planned_end ?? s.ended_at ?? start.getTime() + 30 * 60_000,
                );
                if (!isSameDay(start, day)) return null;
                const startMin =
                  start.getHours() * 60 + start.getMinutes();
                const endMin = end.getHours() * 60 + end.getMinutes();
                const top =
                  ((startMin - CALENDAR_DAY_START_HOUR * 60) / 60) *
                  CALENDAR_HOUR_HEIGHT_PX;
                const height = Math.max(
                  20,
                  ((endMin - startMin) / 60) * CALENDAR_HOUR_HEIGHT_PX - 2,
                );
                return (
                  <div
                    key={s.id}
                    className="absolute left-0.5 right-0.5"
                    style={{ top, height }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSession(s);
                    }}
                  >
                    <SessionBlock session={s} className="h-full" />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Click an empty slot to plan a 1-hour session. Click a block to edit.
      </p>
      <DayDistanceLabel weekStart={weekStart} />
    </div>
  );
}

function formatHourLabel(hour: number) {
  const normalized = hour >= 24 ? hour - 24 : hour;
  if (normalized === 0) return "12a";
  if (normalized === 12) return "12p";
  if (normalized < 12) return `${normalized}a`;
  return `${normalized - 12}p`;
}

function DayDistanceLabel({ weekStart }: { weekStart: Date }) {
  const end = addDays(weekStart, 6);
  return (
    <div className="mt-1 text-xs text-muted-foreground">
      Week of {format(weekStart, "MMM d")} – {format(end, "MMM d, yyyy")}
    </div>
  );
}
