"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Pause, Play, Square } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { SessionTodoChecklist } from "@/components/session-todo-checklist";
import { TrackTodoList } from "@/components/mobile/track-todo-list";
import { TrackPicker, type PickableTrack } from "@/components/track-picker";
import { SessionTypePicker } from "@/components/session-type-picker";
import { useFocusSession } from "@/components/focus-session-provider";
import { useToast } from "@/components/toast";
import {
  canSelectSessionType,
  resolveTrackSelection,
  shouldReseedGoal,
} from "@/lib/focus-runner";
import type { ActionRow, SessionTypeRow, TrackRow } from "@/lib/types";

export function FocusRunner({
  track,
  sessionType,
  sessionTypes,
  tracks,
  trackTodos,
}: {
  track: TrackRow | null;
  sessionType?: SessionTypeRow | null;
  sessionTypes?: SessionTypeRow[];
  tracks?: PickableTrack[];
  trackTodos?: ActionRow[];
}) {
  const router = useRouter();
  const ctx = useFocusSession();
  const { toast } = useToast();

  // The next action is the top of the open task list — an ordering, not a
  // stored flag — so the session goal and the track page always agree about
  // what "next" means without a second copy of the row.
  const nextTask = trackTodos?.[0] ?? null;

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

  // Before Start, the session type picker is local state seeded from the
  // `?type=` the sidebar's start button may have arrived with. Once a
  // session is running, `ctx.sessionTypeId` is the only copy that matters —
  // the picker writes straight to it so the log page (which reads the
  // context directly) sees the change immediately.
  const [pendingSessionTypeId, setPendingSessionTypeId] = useState<string | null>(
    sessionType?.id ?? null,
  );
  const phaseForType = pageOwnsSession ? ctx.phase : "idle";
  const effectiveSessionTypeId =
    phaseForType === "idle" ? pendingSessionTypeId : ctx.sessionTypeId;
  const effectiveSessionType =
    sessionTypes?.find((t) => t.id === effectiveSessionTypeId) ?? null;

  // The goal re-seeds from the (new) track's top task whenever the attached
  // track changes underneath a running session, unless the user has typed
  // their own goal — see `shouldReseedGoal`. Read off individually rather
  // than as `ctx.x` so the effect only reruns when one of these actually
  // changes, not on every ~250ms timer tick.
  const { phase: ctxPhase, goalTrackId, goalEdited, seedGoal } = ctx;
  useEffect(() => {
    if (!pageOwnsSession || ctxPhase === "idle") return;
    const trackId = track?.id ?? null;
    if (shouldReseedGoal({ trackId, goalTrackId, goalEdited })) {
      seedGoal(trackId, nextTask?.description ?? "");
    }
  }, [
    pageOwnsSession,
    ctxPhase,
    track?.id,
    goalTrackId,
    goalEdited,
    seedGoal,
    nextTask?.description,
  ]);

  const handleTrackChange = (nextId: string | null) => {
    const result = resolveTrackSelection({
      nextTrackId: nextId,
      sessionTypeRequiresTrack: effectiveSessionType?.requires_track ?? false,
      sessionTypeName: effectiveSessionType?.name,
    });
    if (!result.allowed) {
      toast(result.reason);
      return;
    }
    // A running/paused session carries its identity in the provider, not the
    // URL — patch it before navigating so the new page recognizes ownership
    // (and keeps ticking) the instant it mounts, instead of a frame where it
    // looks like a session running "elsewhere".
    if (pageOwnsSession && ctx.phase !== "idle") {
      const nextTrack = nextId ? (tracks?.find((t) => t.id === nextId) ?? null) : null;
      ctx.setTrack(nextId, nextTrack?.name ?? null);
      router.replace(result.path);
      return;
    }
    // Before Start there's no session in the provider to carry the picked
    // type across the navigation, so it rides the same `?type=` query the
    // sidebar's start button already uses — both focus pages read it.
    const query = pendingSessionTypeId ? `?type=${pendingSessionTypeId}` : "";
    router.replace(`${result.path}${query}`);
  };

  const handleSessionTypeChange = (nextId: string | null) => {
    const type = nextId ? (sessionTypes?.find((t) => t.id === nextId) ?? null) : null;
    const currentTrackId = track?.id ?? null;
    if (type && !canSelectSessionType(type, currentTrackId)) {
      toast(`${type.name} sessions require a track.`);
      return;
    }
    if (pageOwnsSession && ctx.phase !== "idle") {
      ctx.setSessionType(nextId);
    } else {
      setPendingSessionTypeId(nextId);
    }
  };

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

  const headline = track?.name ?? effectiveSessionType?.name ?? "Focus";

  const start = () => {
    // A session type flagged requires_track can't run track-less from
    // /focus/new.
    if (!track && effectiveSessionType?.requires_track) {
      toast(`${effectiveSessionType.name} sessions require a track.`);
      return;
    }
    ctx.start({
      trackId: track?.id ?? null,
      trackName: track?.name ?? effectiveSessionType?.name ?? null,
      sessionTypeId: effectiveSessionType?.id ?? null,
      // Committing to one outcome up front; the log page asks whether you
      // got there. Defaults to the top open task.
      goal: nextTask?.description ?? "",
    });
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-10 text-center">
      <div className="flex w-full justify-start">
        {track ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/tracks/${track.id}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to track
            </Link>
          </Button>
        ) : (
          <BackLink fallback="/" label="Back to Home" />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {track ? "Focus" : "Session"}
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">{headline}</h1>
        {track && (
          <p className="text-lg text-muted-foreground">
            {nextTask
              ? nextTask.description
              : "No open tasks — add one below to anchor the session."}
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
              placeholder="Add a task for this session…"
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

      {/* Track and session type — pick or change either before Start and
          while running. One row on desktop, stacked on a phone. */}
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 text-left md:flex-row md:items-start">
        {tracks && (
          <TrackPicker
            tracks={tracks}
            value={track?.id ?? null}
            onChange={handleTrackChange}
            size="lg"
            className="md:flex-1"
          />
        )}
        {sessionTypes && sessionTypes.length > 0 && (
          <div className="flex min-w-0 flex-col gap-1 md:flex-1">
            <SessionTypePicker
              types={sessionTypes}
              value={effectiveSessionTypeId}
              onChange={handleSessionTypeChange}
              isDisabled={(t) => !canSelectSessionType(t, track?.id ?? null)}
              disabledHint="Requires a track — pick one first."
              size="lg"
            />
            {!track &&
              sessionTypes.some(
                (t) => t.id !== effectiveSessionTypeId && t.requires_track,
              ) && (
                <p className="text-xs text-muted-foreground">
                  Some session types need a track — pick one above to unlock them.
                </p>
              )}
          </div>
        )}
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
