import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
} from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CalendarSession = {
  id: string;
  started_at: string;
  duration_seconds: number | null;
  track: { id: string; name: string };
};

async function getMonthSessions(
  year: number,
  month: number,
): Promise<CalendarSession[]> {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, started_at, duration_seconds, track:tracks!inner(id, name, owner_id)",
    )
    .gte("started_at", start.toISOString())
    .lt("started_at", end.toISOString())
    .eq("tracks.owner_id", OWNER_ID)
    .order("started_at", { ascending: true });
  if (error) throw error;
  type Row = {
    id: string;
    started_at: string;
    duration_seconds: number | null;
    track: { id: string; name: string; owner_id: string } | null;
  };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.track)
    .map((r) => ({
      id: r.id,
      started_at: r.started_at,
      duration_seconds: r.duration_seconds,
      track: { id: r.track!.id, name: r.track!.name },
    }));
}

function parseMonthParam(s: string | undefined): { year: number; month: number } {
  const now = new Date();
  if (!s) return { year: now.getFullYear(), month: now.getMonth() };
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return { year: now.getFullYear(), month: now.getMonth() };
  return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) - 1 };
}

function formatMonthParam(year: number, month: number) {
  return `${year}-${(month + 1).toString().padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const params = await searchParams;
  const { year, month } = parseMonthParam(params.m);
  const sessions = await getMonthSessions(year, month);

  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const byDay = new Map<string, CalendarSession[]>();
  sessions.forEach((s) => {
    const key = format(new Date(s.started_at), "yyyy-MM-dd");
    const list = byDay.get(key) ?? [];
    list.push(s);
    byDay.set(key, list);
  });

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const totalSeconds = sessions.reduce(
    (acc, s) => acc + (s.duration_seconds ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-muted-foreground">
            Session history — {format(monthStart, "MMMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/calendar?m=${formatMonthParam(prev.getFullYear(), prev.getMonth())}`}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/calendar">Today</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/calendar?m=${formatMonthParam(next.getFullYear(), next.getMonth())}`}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 text-xs uppercase tracking-wide text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-2 py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayItems = byDay.get(key) ?? [];
              const inMonth = isSameMonth(day, monthStart);
              const totalMins = Math.round(
                dayItems.reduce(
                  (acc, s) => acc + (s.duration_seconds ?? 0),
                  0,
                ) / 60,
              );
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-24 rounded-md border p-2 text-xs",
                    inMonth
                      ? "border-border bg-surface"
                      : "border-border/40 bg-surface/40 text-muted-foreground",
                    isToday(day) && "ring-1 ring-primary",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{format(day, "d")}</span>
                    {totalMins > 0 && (
                      <span className="text-[10px] text-primary">
                        {totalMins}m
                      </span>
                    )}
                  </div>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {dayItems.slice(0, 3).map((s) => (
                      <li key={s.id} className="truncate">
                        <Link
                          href={`/tracks/${s.track.id}`}
                          className="truncate hover:underline"
                          title={`${s.track.name} · ${Math.round((s.duration_seconds ?? 0) / 60)}m`}
                        >
                          {s.track.name}
                        </Link>
                      </li>
                    ))}
                    {dayItems.length > 3 && (
                      <li className="text-muted-foreground">
                        +{dayItems.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        {sessions.length} sessions this month · {(totalSeconds / 3600).toFixed(1)} hours
      </div>
    </div>
  );
}
