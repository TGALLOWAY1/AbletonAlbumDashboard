"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { SessionTodoChecklist } from "@/components/calendar/session-todo-checklist";
import { TrackTodoList } from "@/components/mobile/track-todo-list";
import { useFocusSession } from "@/components/focus-session-provider";
import { useToast } from "@/components/toast";
import type {
  ActionRow,
  CalendarSessionRow,
  SessionTypeRow,
  TrackRow,
} from "@/lib/types";

export function FocusRunner({
  track,
  primaryAction,
  plannedSession,
  sessionType,
  sessionTypes,
  trackTodos,
}: {
  track: TrackRow | null;
  primaryAction: ActionRow | null;
  plannedSession?: CalendarSessionRow | null;
  sessionType?: SessionTypeRow | null;
  sessionTypes?: SessionTypeRow[];
  tracks?: TrackRow[];
  trackTodos?: ActionRow[];
}) {
  const router = useRouter();
  const ctx = useFocusSession();
  const { toast } = useToast();

  // This page "owns" the running session when its track matches (track mode)
  // or when the active session has no track (track-less mode).
  const pageOwnsSession = track ? ctx.trackId === track.id : ctx.trackId === null;

  const isOtherSessionActive =
    (ctx.phase === "running" || ctx.phase === "paused") && !pageOwnsSession;

  // The moment this page's session stops, send the user to the full-screen
  // production-logging page. The FocusSessionProvider lives in the root layout,
  // so its state survives this client navigation.
  useEffect(() => {
    if (pageOwnsSession && ctx.phase === "stopped") {
      router.push("/focus/log");
    }
  }, [pageOwnsSession, ctx.phase, router]);

  const activeFocusPath = ctx.trackId ? `/focus/${ctx.trackId}` : "/focus/new";

  if (isOtherSessionActive) {
    return (
      <ActiveElsewhereNotice
        activeTrackName={ctx.trackName}
        onReturn={() => router.push(activeFocusPath)}
        onStopAndLog={() => {
          ctx.stop();
          router.push(activeFocusPath);
        }}
      />
    );
  }

  const phase = pageOwnsSession ? ctx.phase : "idle";
  const elapsedMs = pageOwnsSession ? ctx.elapsedMs : 0;
  const todos = pageOwnsSession ? ctx.todos : [];
  const notes = pageOwnsSession ? ctx.notes : "";
  const goal = pageOwnsSession ? ctx.goal : "";

  const runningType = ctx.sessionTypeId
    ? sessionTypes?.find((t) => t.id === ctx.sessionTypeId)
    : null;
  const headline =
    track?.name ??
    runningType?.name ??
    sessionType?.name ??
    plannedSession?.session_type?.name ??
    "Focus";

  const start = () => {
    // Calendar planning enforces requires_track; mirror it here so a
    // track-required session type can't start track-less from /focus/new.
    const effectiveType = sessionType ?? plannedSession?.session_type ?? null;
    if (!track && effectiveType?.requires_track) {
      toast(`${effectiveType.name} sessions require a track.`);
      return;
    }
    // Track sessions own their to-dos through the live TrackTodoList (which
    // writes straight to the track), so only the track-less / planned-session
    // flows seed the ephemeral checklist here.
    const initialTodos = (plannedSession?.todos ?? []).map((t) => ({
      id: t.id,
      description: t.description,
      done: t.done,
    }));
    ctx.start({
      trackId: track?.id ?? null,
      trackName: track?.name ?? sessionType?.name ?? null,
      sessionTypeId: track
        ? (plannedSession?.session_type?.id ?? null)
        : (sessionType?.id ?? plannedSession?.session_type?.id ?? null),
      plannedSessionId: plannedSession?.id ?? null,
      initialTodos,
      // Committing to one outcome up front; the log page asks whether you
      // got there. Defaults to the track's primary action.
      goal: primaryAction?.description ?? "",
    });
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-10 text-center">
      <div className="flex w-full justify-start">
        <Button asChild variant="ghost" size="sm">
          {track ? (
            <Link href={`/tracks/${track.id}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to track
            </Link>
          ) : (
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          )}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {track ? (plannedSession?.session_type?.name ?? "Focus") : "Session"}
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">{headline}</h1>
        {track && (
          <p className="text-lg text-muted-foreground">
            {primaryAction
              ? primaryAction.description
              : "No primary action — set one to anchor the session."}
          </p>
        )}
        <div className="mx-auto mt-2 w-full max-w-md text-left">
          {track ? (
            <TrackTodoList
              trackId={track.id}
              initial={trackTodos ?? []}
              variant="mobile"
            />
          ) : (
            <SessionTodoChecklist
              items={todos}
              onChange={ctx.setTodos}
              placeholder="Add a todo for this session…"
            />
          )}
        </div>
        {phase !== "idle" && (
          <div className="mx-auto mt-1 w-full max-w-md text-left">
            <Label htmlFor="focus-goal" className="text-xs text-muted-foreground">
              This session&apos;s goal
            </Label>
            <Input
              id="focus-goal"
              value={goal}
              onChange={(e) => ctx.setGoal(e.target.value)}
              placeholder="One outcome you're aiming for…"
              className="mt-1"
            />
          </div>
        )}
        <div className="mx-auto mt-1 w-full max-w-md text-left">
          <Label htmlFor="focus-notes" className="text-xs text-muted-foreground">
            Session notes
          </Label>
          <Textarea
            id="focus-notes"
            value={notes}
            onChange={(e) => ctx.setNotes(e.target.value)}
            rows={3}
            placeholder="Jot ideas, blockers, or thoughts as they come up…"
            className="mt-1"
          />
        </div>
      </div>

      <div className="font-mono text-7xl tabular-nums">
        {formatHMS(elapsedMs)}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {phase === "idle" && (
          <Button size="lg" onClick={start}>
            <Play className="h-5 w-5" />
            Start session
          </Button>
        )}
        {phase === "running" && (
          <>
            <Button size="lg" variant="outline" onClick={ctx.pause}>
              <Pause className="h-5 w-5" />
              Pause
            </Button>
            <Button size="lg" variant="accent" onClick={ctx.stop}>
              <Square className="h-5 w-5" />
              Stop &amp; log
            </Button>
          </>
        )}
        {phase === "paused" && (
          <>
            <Button size="lg" onClick={ctx.resume}>
              <Play className="h-5 w-5" />
              Resume
            </Button>
            <Button size="lg" variant="accent" onClick={ctx.stop}>
              <Square className="h-5 w-5" />
              Stop &amp; log
            </Button>
          </>
        )}
        {phase === "stopped" && (
          <Button size="lg" onClick={() => router.push("/focus/log")}>
            <Square className="h-5 w-5" />
            Log session
          </Button>
        )}
      </div>
    </div>
  );
}

function ActiveElsewhereNotice({
  activeTrackName,
  onReturn,
  onStopAndLog,
}: {
  activeTrackName: string | null;
  onReturn: () => void;
  onStopAndLog: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-6 text-center">
      <div className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Focus
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          A session is already running
        </h1>
        <p className="text-muted-foreground">
          You have an active focus session on{" "}
          <span className="font-medium text-foreground">
            {activeTrackName ?? "another track"}
          </span>
          . Return to it or stop and log it before starting a new one.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={onReturn}>
          Return to session
        </Button>
        <Button size="lg" variant="outline" onClick={onStopAndLog}>
          Stop &amp; log
        </Button>
      </div>
    </div>
  );
}

function formatHMS(totalMs: number) {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
