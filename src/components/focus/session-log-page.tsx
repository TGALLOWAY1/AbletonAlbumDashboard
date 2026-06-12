"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AudioLines, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useFocusSession } from "@/components/focus-session-provider";
import { useToast } from "@/components/toast";
import { completeSession } from "@/app/actions/sessions";
import {
  PRODUCTION_ACTIVITIES,
  type ProductionActivityKey,
} from "@/lib/production-activities";
import {
  BOTTLENECK_CATEGORIES,
  BOTTLENECK_LABELS,
  type SessionTypeRow,
  type TrackRow,
} from "@/lib/types";
import { SessionOverviewCard } from "./session-overview-card";
import {
  ProductionActivityGrid,
  type ActivityState,
} from "./production-activity-grid";
import { SessionOutcomeRating } from "./session-outcome-rating";
import { SessionCompletionSummary } from "./session-completion-summary";

const EMPTY_ACTIVITIES: ActivityState = Object.fromEntries(
  PRODUCTION_ACTIVITIES.map((a) => [a.key, { minutes: 0, note: "" }]),
) as ActivityState;

export function SessionLogPage({
  tracks,
  sessionTypes,
}: {
  tracks: TrackRow[];
  sessionTypes: SessionTypeRow[];
}) {
  const router = useRouter();
  const ctx = useFocusSession();
  const [pending, startTx] = useTransition();
  const [settled, setSettled] = useState(false);
  const { toast } = useToast();

  // Freeze the start/end window once, when the page first has a session, so the
  // displayed "Started" time and the saved start/end don't drift on re-render.
  const [timeWindow] = useState(() => {
    const ended = new Date();
    const started = new Date(ended.getTime() - ctx.accumulatedMs);
    return { startedAt: started, endedAt: ended };
  });

  const [activities, setActivities] = useState<ActivityState>(EMPTY_ACTIVITIES);
  const [goalAchieved, setGoalAchieved] = useState<boolean | null>(null);
  const [progressImpact, setProgressImpact] = useState<number | null>(null);
  const [enjoyment, setEnjoyment] = useState<number | null>(null);
  const [generalNote, setGeneralNote] = useState(() => ctx.notes ?? "");
  const [bottleneckDesc, setBottleneckDesc] = useState("");
  const [bottleneckCat, setBottleneckCat] = useState<string>("arrangement");

  // Give sessionStorage a tick to hydrate before deciding there's no session
  // (covers a hard reload landing directly on /focus/log).
  useEffect(() => {
    const id = setTimeout(() => setSettled(true), 80);
    return () => clearTimeout(id);
  }, []);

  const hasSession = ctx.phase === "stopped" || ctx.accumulatedMs > 0;

  const track = ctx.trackId
    ? (tracks.find((t) => t.id === ctx.trackId) ?? null)
    : null;
  const sessionType = ctx.sessionTypeId
    ? (sessionTypes.find((t) => t.id === ctx.sessionTypeId) ?? null)
    : null;
  const contextLabel =
    track?.name ?? ctx.trackName ?? sessionType?.name ?? "Focus session";

  const sessionMinutes = Math.round(ctx.accumulatedMs / 60_000);
  const totalTracked = useMemo(
    () =>
      PRODUCTION_ACTIVITIES.reduce(
        (sum, a) => sum + activities[a.key].minutes,
        0,
      ),
    [activities],
  );

  const patchActivity = (
    key: ProductionActivityKey,
    patch: Partial<{ minutes: number; note: string }>,
  ) => {
    setActivities((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const resetActivities = () => setActivities(EMPTY_ACTIVITIES);

  // One-tap logging: assign the whole session to a single activity. The grid
  // below stays available for fine-tuning longer sessions.
  const applyPreset = (key: ProductionActivityKey) => {
    const minutes = Math.max(1, sessionMinutes);
    setActivities((prev) => {
      const next = { ...prev };
      PRODUCTION_ACTIVITIES.forEach((a) => {
        next[a.key] = {
          ...next[a.key],
          minutes: a.key === key ? minutes : 0,
        };
      });
      return next;
    });
  };

  const presetKey = useMemo(() => {
    const nonZero = PRODUCTION_ACTIVITIES.filter(
      (a) => activities[a.key].minutes > 0,
    );
    return nonZero.length === 1 ? nonZero[0].key : null;
  }, [activities]);

  const autoBalance = () => {
    const active = PRODUCTION_ACTIVITIES.filter(
      (a) => activities[a.key].minutes > 0,
    );
    if (active.length === 0 || sessionMinutes <= 0) return;
    const per = Math.max(0, Math.round(sessionMinutes / active.length / 5) * 5);
    setActivities((prev) => {
      const next = { ...prev };
      active.forEach((a, i) => {
        // Put the rounding remainder on the first activity so the total lands
        // exactly on the tracked session duration.
        const mins =
          i === 0 ? sessionMinutes - per * (active.length - 1) : per;
        next[a.key] = { ...next[a.key], minutes: Math.max(0, mins) };
      });
      return next;
    });
  };

  const discard = () => {
    if (
      !window.confirm(
        "Discard this session without saving? Your tracked time and notes will be lost.",
      )
    )
      return;
    ctx.reset();
    router.push(track ? `/tracks/${track.id}` : "/");
    router.refresh();
  };

  const save = () => {
    // No dedicated column for the goal yet — record it (and whether it was
    // reached) at the top of the session notes so it shows up in history.
    const goal = ctx.goal.trim();
    const goalLine = goal
      ? `**Goal:** ${goal}${
          goalAchieved == null ? "" : goalAchieved ? " — reached" : " — not reached"
        }`
      : null;
    const notesMd = [goalLine, generalNote.trim()]
      .filter(Boolean)
      .join("\n\n");

    startTx(async () => {
      try {
        await completeSession({
          sessionId: ctx.plannedSessionId ?? null,
          trackId: ctx.trackId,
          sessionTypeId: ctx.sessionTypeId,
          startedAt: timeWindow.startedAt.toISOString(),
          endedAt: timeWindow.endedAt.toISOString(),
          notesMd,
          enjoymentRating: enjoyment,
          progressImpact,
          activities: PRODUCTION_ACTIVITIES.map((a) => ({
            key: a.key,
            minutes: activities[a.key].minutes,
            note: activities[a.key].note,
          })),
          newBottleneckDescription: track ? bottleneckDesc : undefined,
          newBottleneckCategory:
            track && bottleneckDesc ? bottleneckCat : undefined,
          // Track sessions own their to-dos via the track itself; only the
          // track-less flow carries an ephemeral checklist worth persisting.
          todos: track
            ? undefined
            : ctx.todos
                .map((t) => ({ description: t.description.trim(), done: t.done }))
                .filter((t) => t.description.length > 0),
        });
        ctx.reset();
        router.push(track ? `/tracks/${track.id}` : "/");
        router.refresh();
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  // --- Render guards -------------------------------------------------------
  if (!hasSession) {
    if (!settled) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          Preparing your session…
        </div>
      );
    }
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-xl font-semibold">No session to log</h1>
        <p className="text-muted-foreground">
          Start a focus session, then stop it to log how you spent your time.
        </p>
        <Button asChild>
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link
            href={track ? `/focus/${track.id}` : "/focus/new"}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <AudioLines className="h-4 w-4" aria-hidden />
          </span>
          <h1 className="text-lg font-semibold tracking-tight">
            New Focus Session
          </h1>
        </div>
        <span className="w-9" aria-hidden />
      </div>

      <SessionOverviewCard
        startedAt={timeWindow.startedAt}
        durationMinutes={sessionMinutes}
        onEnd={discard}
        ended
      />

      {/* Goal check */}
      {ctx.goal.trim() && (
        <Card className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Session goal
          </div>
          <p className="mt-1 text-sm font-medium">{ctx.goal}</p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant={goalAchieved === true ? "default" : "outline"}
              onClick={() =>
                setGoalAchieved(goalAchieved === true ? null : true)
              }
            >
              Reached it
            </Button>
            <Button
              size="sm"
              variant={goalAchieved === false ? "accent" : "outline"}
              onClick={() =>
                setGoalAchieved(goalAchieved === false ? null : false)
              }
            >
              Not yet
            </Button>
          </div>
        </Card>
      )}

      {/* Time allocation */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">How did you spend your time?</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {contextLabel} · Tap what you mostly did, or break it down in
              detail below.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetActivities}
            className="shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset All
          </Button>
        </div>

        {/* One-tap presets: the fast path for short sessions */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRODUCTION_ACTIVITIES.map((a) => (
            <button key={a.key} type="button" onClick={() => applyPreset(a.key)}>
              <Badge
                variant={presetKey === a.key ? "primary" : "default"}
                className="cursor-pointer"
              >
                {a.label}
              </Badge>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <ProductionActivityGrid values={activities} onChange={patchActivity} />
        </div>
      </Card>

      <SessionOutcomeRating
        progressImpact={progressImpact}
        enjoyment={enjoyment}
        onProgressImpactChange={setProgressImpact}
        onEnjoymentChange={setEnjoyment}
      />

      {/* General note */}
      <Textarea
        value={generalNote}
        onChange={(e) => setGeneralNote(e.target.value)}
        rows={2}
        placeholder="Add general note about this session…"
        className="bg-surface"
      />

      {/* Bottleneck — secondary, track sessions only */}
      {track && (
        <details className="rounded-lg border border-border bg-surface px-4 py-3 text-sm [&_summary]:cursor-pointer">
          <summary className="font-medium text-muted-foreground">
            Update bottleneck (optional)
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            <Textarea
              value={bottleneckDesc}
              onChange={(e) => setBottleneckDesc(e.target.value)}
              rows={2}
              placeholder="Replaces the current bottleneck if filled in."
            />
            {bottleneckDesc && (
              <div className="flex flex-wrap gap-1.5">
                {BOTTLENECK_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBottleneckCat(c)}
                  >
                    <Badge
                      variant={bottleneckCat === c ? "warning" : "default"}
                      className="cursor-pointer"
                    >
                      {BOTTLENECK_LABELS[c]}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        </details>
      )}

      <SessionCompletionSummary
        totalTracked={totalTracked}
        sessionMinutes={sessionMinutes}
        onAutoBalance={autoBalance}
        onReset={resetActivities}
      />

      <Button size="lg" className="w-full" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save Session"}
      </Button>
    </div>
  );
}
