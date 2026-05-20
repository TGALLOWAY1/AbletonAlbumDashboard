"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, addMonths, format, subDays, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { MonthView } from "./month-view";
import { AgendaView } from "./agenda-view";
import { SessionPlanDialog, type PlanDialogInitial } from "./session-plan-dialog";
import { SessionCompleteDialog } from "./session-complete-dialog";
import { WeeklyIntentionPanel } from "./weekly-intention-panel";
import { markSessionInProgress } from "@/app/actions/sessions";
import { isoDate, startOfWeekMonday } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type {
  CalendarSessionRow,
  SessionTypeRow,
  TrackRow,
  WeeklyReviewRow,
} from "@/lib/types";
import type { TemplateWithTodos } from "@/lib/data/session-templates";

type View = "agenda" | "day" | "week" | "month";

function buildDraft(session: CalendarSessionRow) {
  const startedAt =
    session.started_at ??
    session.planned_start ??
    new Date(0).toISOString();
  const endedAt =
    session.ended_at ?? session.planned_end ?? new Date(0).toISOString();
  const durationSeconds =
    session.duration_seconds ??
    Math.max(
      0,
      Math.round(
        (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
      ),
    );
  return { startedAt, endedAt, durationSeconds };
}

export function CalendarClient({
  initialView,
  anchorIso,
  sessions,
  sessionTypes,
  tracks,
  templates,
  weeklyReview,
}: {
  initialView: View;
  anchorIso: string;
  sessions: CalendarSessionRow[];
  sessionTypes: SessionTypeRow[];
  tracks: TrackRow[];
  templates: TemplateWithTodos[];
  weeklyReview: WeeklyReviewRow | null;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>(initialView);
  const anchor = useMemo(() => new Date(anchorIso), [anchorIso]);

  const [planOpen, setPlanOpen] = useState(false);
  const [planInitial, setPlanInitial] = useState<PlanDialogInitial | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeSession, setCompleteSession] =
    useState<CalendarSessionRow | null>(null);

  const navigate = (newAnchor: Date, newView?: View) => {
    const v = newView ?? view;
    const param = isoDate(v === "week" ? startOfWeekMonday(newAnchor) : newAnchor);
    const qs = new URLSearchParams({ view: v, d: param });
    router.push(`/calendar?${qs.toString()}`);
  };

  const goPrev = () => {
    if (view === "day") navigate(subDays(anchor, 1));
    else if (view === "week") navigate(subDays(anchor, 7));
    else if (view === "agenda") navigate(subDays(anchor, 7));
    else navigate(subMonths(anchor, 1));
  };
  const goNext = () => {
    if (view === "day") navigate(addDays(anchor, 1));
    else if (view === "week") navigate(addDays(anchor, 7));
    else if (view === "agenda") navigate(addDays(anchor, 7));
    else navigate(addMonths(anchor, 1));
  };
  const goToday = () => navigate(new Date());
  const setViewParam = (v: View) => {
    setView(v);
    navigate(anchor, v);
  };

  const openPlanDialog = (start: Date, end: Date) => {
    setPlanInitial({
      plannedStart: start,
      plannedEnd: end,
      sessionTypeId: null,
      trackId: tracks[0]?.id ?? null,
    });
    setPlanOpen(true);
  };

  const openSessionDetail = (session: CalendarSessionRow) => {
    if (session.status === "completed" || session.status === "in_progress") {
      setCompleteSession(session);
      setCompleteOpen(true);
      return;
    }
    setPlanInitial({
      plannedStart: new Date(session.planned_start ?? session.started_at!),
      plannedEnd: new Date(session.planned_end ?? session.ended_at!),
      sessionTypeId: session.session_type?.id ?? null,
      trackId: session.track?.id ?? null,
      notesMd: session.notes_md ?? "",
      todos: session.todos.map((t) => ({
        id: t.id,
        description: t.description,
        done: t.done,
      })),
      existing: session,
    });
    setPlanOpen(true);
  };

  const startNow = async (session: CalendarSessionRow) => {
    await markSessionInProgress(session.id);
    if (session.track?.id) {
      router.push(`/focus/${session.track.id}?session=${session.id}`);
    } else {
      router.refresh();
    }
  };

  const headerLabel = (() => {
    if (view === "day") return format(anchor, "EEEE, MMMM d, yyyy");
    if (view === "week") {
      const ws = startOfWeekMonday(anchor);
      const we = addDays(ws, 6);
      return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    }
    if (view === "agenda") {
      return `Upcoming from ${format(anchor, "MMM d")}`;
    }
    return format(anchor, "MMMM yyyy");
  })();

  const upcomingPlanned = sessions
    .filter((s) => s.status === "planned")
    .sort((a, b) => {
      const at = new Date(a.planned_start ?? 0).getTime();
      const bt = new Date(b.planned_start ?? 0).getTime();
      return at - bt;
    })
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-muted-foreground">{headerLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border bg-surface p-0.5">
            {(["agenda", "day", "week", "month"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewParam(v)}
                className={cn(
                  "rounded-sm px-3 py-1 text-xs font-medium capitalize transition-colors",
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const start = new Date();
              start.setMinutes(0, 0, 0);
              start.setHours(start.getHours() + 1);
              const end = new Date(start.getTime() + 60 * 60_000);
              openPlanDialog(start, end);
            }}
          >
            <Plus className="h-4 w-4" />
            New session
          </Button>
        </div>
      </header>

      {view === "week" && (
        <WeeklyIntentionPanel
          weekStart={startOfWeekMonday(anchor)}
          initialIntention={weeklyReview?.intention ?? ""}
          initialReflection={weeklyReview?.reflection ?? ""}
        />
      )}

      {upcomingPlanned.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Up next
            </div>
            <ul className="grid gap-2 lg:grid-cols-3">
              {upcomingPlanned.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                >
                  <div className="flex min-w-0 flex-col">
                    <span
                      className="truncate font-medium"
                      style={{ color: s.session_type?.color ?? undefined }}
                    >
                      {s.session_type?.name ?? "Session"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {s.planned_start
                        ? format(new Date(s.planned_start), "EEE MMM d, h:mma")
                        : ""}
                      {s.track ? ` · ${s.track.name}` : ""}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => startNow(s)}
                  >
                    <PlayCircle className="h-4 w-4" />
                    Start
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-3">
          {view === "week" && (
            <WeekView
              weekStart={startOfWeekMonday(anchor)}
              sessions={sessions}
              onCreateSlot={openPlanDialog}
              onSelectSession={openSessionDetail}
            />
          )}
          {view === "day" && (
            <DayView
              day={anchor}
              sessions={sessions}
              onCreateSlot={openPlanDialog}
              onSelectSession={openSessionDetail}
            />
          )}
          {view === "month" && (
            <MonthView
              monthAnchor={anchor}
              sessions={sessions}
              onCreateSlot={openPlanDialog}
              onSelectSession={openSessionDetail}
            />
          )}
          {view === "agenda" && (
            <AgendaView
              rangeStart={anchor}
              rangeEnd={addDays(anchor, 30)}
              sessions={sessions}
              onCreateSlot={openPlanDialog}
              onSelectSession={openSessionDetail}
              onStartNow={startNow}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {sessions.length} session{sessions.length === 1 ? "" : "s"} on screen
        </span>
        <Link
          href="/settings/session-types"
          className="text-primary hover:underline"
        >
          Manage session types →
        </Link>
      </div>

      <SessionPlanDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        initial={planInitial}
        sessionTypes={sessionTypes}
        tracks={tracks}
        templates={templates}
      />
      <SessionCompleteDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        session={completeSession}
        draft={completeSession ? buildDraft(completeSession) : null}
        sessionTypes={sessionTypes}
        tracks={tracks}
      />
    </div>
  );
}
