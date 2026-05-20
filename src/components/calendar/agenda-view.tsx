"use client";

import { useMemo } from "react";
import {
  addDays,
  format,
  isSameDay,
  isToday,
  startOfDay,
} from "date-fns";
import { CalendarDays, PlayCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionBlock } from "./session-block";
import type { CalendarSessionRow } from "@/lib/types";

function dayLabel(day: Date, today: Date) {
  if (isToday(day)) return "Today";
  if (isSameDay(day, addDays(today, 1))) return "Tomorrow";
  return format(day, "EEE MMM d");
}

export function AgendaView({
  rangeStart,
  rangeEnd,
  sessions,
  onCreateSlot,
  onSelectSession,
  onStartNow,
}: {
  rangeStart: Date;
  rangeEnd: Date;
  sessions: CalendarSessionRow[];
  onCreateSlot: (start: Date, end: Date) => void;
  onSelectSession: (session: CalendarSessionRow) => void;
  onStartNow: (session: CalendarSessionRow) => void;
}) {
  const today = startOfDay(new Date());

  // Group sessions by day. Skip days with no sessions; we don't render
  // an empty timeline for every day in the range.
  const groups = useMemo(() => {
    const map = new Map<string, CalendarSessionRow[]>();
    sessions.forEach((s) => {
      const start = s.planned_start ?? s.started_at;
      if (!start) return;
      const key = format(new Date(start), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    });
    // Sort each group by start time.
    for (const list of map.values()) {
      list.sort((a, b) => {
        const at = new Date(a.planned_start ?? a.started_at ?? 0).getTime();
        const bt = new Date(b.planned_start ?? b.started_at ?? 0).getTime();
        return at - bt;
      });
    }
    // Return entries sorted by date ascending.
    return Array.from(map.entries())
      .map(([iso, list]) => ({
        iso,
        day: new Date(iso + "T00:00:00"),
        sessions: list,
      }))
      .sort((a, b) => a.day.getTime() - b.day.getTime());
  }, [sessions]);

  const handleQuickAdd = (day: Date) => {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000);
    onCreateSlot(start, end);
  };

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border bg-surface-2/40 p-8 text-center">
        <CalendarDays className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No sessions scheduled between {format(rangeStart, "MMM d")} and{" "}
          {format(rangeEnd, "MMM d")}.
        </p>
        <Button
          size="sm"
          onClick={() => {
            const start = new Date();
            start.setMinutes(0, 0, 0);
            start.setHours(start.getHours() + 1);
            const end = new Date(start.getTime() + 60 * 60_000);
            onCreateSlot(start, end);
          }}
        >
          <Plus className="h-4 w-4" />
          Schedule a session
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <section key={g.iso} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {dayLabel(g.day, today)}
              <span className="ml-2 font-normal normal-case text-muted-foreground/70">
                {format(g.day, "MMM d")}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => handleQuickAdd(g.day)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              aria-label="Add session this day"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {g.sessions.map((s) => (
              <li key={s.id} className="flex items-stretch gap-2">
                <div className="flex-1">
                  <SessionBlock
                    session={s}
                    onClick={() => onSelectSession(s)}
                    compact={false}
                  />
                </div>
                {s.status === "planned" && (
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => onStartNow(s)}
                    aria-label="Start session now"
                    className="shrink-0"
                  >
                    <PlayCircle className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
