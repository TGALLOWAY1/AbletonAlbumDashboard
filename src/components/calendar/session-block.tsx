"use client";

import { CheckCircle2, Circle, Clock, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarSessionRow } from "@/lib/types";

export function SessionBlock({
  session,
  onClick,
  compact = false,
  className,
  style,
}: {
  session: CalendarSessionRow;
  onClick?: () => void;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const color = session.session_type?.color ?? "#9E9E9E";
  const isPlanned = session.status === "planned";
  const isInProgress = session.status === "in_progress";
  const isCompleted = session.status === "completed";

  const start = session.planned_start ?? session.started_at;
  const end = session.planned_end ?? session.ended_at;
  const startLabel = start ? formatTime(start) : "";
  const endLabel = end ? formatTime(end) : "";

  const totalTodos = session.todos.length;
  const doneTodos = session.todos.filter((t) => t.done).length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col items-start gap-0.5 overflow-hidden rounded-md border p-1.5 text-left text-xs transition-all hover:brightness-105",
        isPlanned && "border-dashed",
        isCompleted && "opacity-80",
        className,
      )}
      style={{
        backgroundColor: hexWithAlpha(color, isCompleted ? 0.18 : 0.28),
        borderColor: color,
        color: "var(--color-foreground)",
        ...style,
      }}
    >
      <div className="flex w-full items-center gap-1">
        {isCompleted ? (
          <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color }} />
        ) : isInProgress ? (
          <PlayCircle className="h-3 w-3 shrink-0" style={{ color }} />
        ) : (
          <Circle className="h-3 w-3 shrink-0" style={{ color }} />
        )}
        <span className="truncate font-medium">
          {session.session_type?.name ?? "Session"}
        </span>
      </div>

      {!compact && (
        <>
          {session.track && (
            <span className="truncate text-[11px] opacity-80">
              {session.track.name}
            </span>
          )}
          {(startLabel || totalTodos > 0) && (
            <div className="flex w-full items-center gap-2 text-[10px] opacity-70">
              {startLabel && (
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {startLabel}
                  {endLabel ? `–${endLabel}` : ""}
                </span>
              )}
              {totalTodos > 0 && (
                <span>
                  {doneTodos}/{totalTodos} tasks
                </span>
              )}
            </div>
          )}
        </>
      )}
    </button>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function hexWithAlpha(hex: string, alpha: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
