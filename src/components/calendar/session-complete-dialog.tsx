"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { completeSession } from "@/app/actions/sessions";
import { TrackPicker } from "./track-picker";
import { SessionTypePicker } from "./session-type-picker";
import { cn } from "@/lib/utils";
import {
  BOTTLENECK_CATEGORIES,
  BOTTLENECK_LABELS,
  type CalendarSessionRow,
  type SessionTypeRow,
  type TrackRow,
} from "@/lib/types";

export type CompleteDraft = {
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
};

export function SessionCompleteDialog({
  open,
  onOpenChange,
  session,
  draft,
  sessionTypes,
  tracks,
  initialSessionTypeId,
  initialTrackId,
  initialTodos,
  initialNotes,
  onCompleted,
  redirectTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CalendarSessionRow | null;
  draft: CompleteDraft | null;
  sessionTypes: SessionTypeRow[];
  tracks: TrackRow[];
  initialSessionTypeId?: string | null;
  initialTrackId?: string | null;
  initialTodos?: Array<{ id: string; description: string; done: boolean }>;
  initialNotes?: string;
  onCompleted?: () => void;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, startTx] = useTransition();
  const [improved, setImproved] = useState("");
  const [stillBroken, setStillBroken] = useState("");
  const [notesMd, setNotesMd] = useState("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [enjoyment, setEnjoyment] = useState<number | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(null);
  const [todoState, setTodoState] = useState<
    Array<{ id: string; description: string; done: boolean }>
  >([]);
  const [carryUnchecked, setCarryUnchecked] = useState(true);
  const [manualMinutes, setManualMinutes] = useState("");
  const [bottleneckDesc, setBottleneckDesc] = useState("");
  const [bottleneckCat, setBottleneckCat] = useState<string>("arrangement");

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setImproved(session?.improved ?? "");
    setStillBroken(session?.still_broken ?? "");
    setNotesMd(initialNotes ?? session?.notes_md ?? "");
    setEnergy(session?.energy_rating ?? null);
    setEnjoyment(session?.enjoyment_rating ?? null);
    setTrackId(session?.track?.id ?? initialTrackId ?? null);
    setSessionTypeId(session?.session_type?.id ?? initialSessionTypeId ?? null);
    setTodoState(
      initialTodos
        ? initialTodos.map((t) => ({
            id: t.id,
            description: t.description,
            done: t.done,
          }))
        : (session?.todos ?? []).map((t) => ({
            id: t.id,
            description: t.description,
            done: t.done,
          })),
    );
    setCarryUnchecked(true);
    setManualMinutes("");
    setBottleneckDesc("");
    setBottleneckCat("arrangement");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [
    open,
    session,
    initialTodos,
    initialNotes,
    initialSessionTypeId,
    initialTrackId,
  ]);

  const computedDurationSec = (() => {
    if (manualMinutes && /^\d+$/.test(manualMinutes)) {
      return parseInt(manualMinutes, 10) * 60;
    }
    return draft?.durationSeconds ?? 0;
  })();

  const submit = () => {
    if (!draft && !session) return;

    let startedAt = draft?.startedAt ?? session?.started_at ?? null;
    let endedAt = draft?.endedAt ?? session?.ended_at ?? null;
    if (manualMinutes && /^\d+$/.test(manualMinutes)) {
      const mins = parseInt(manualMinutes, 10);
      const end = new Date();
      const startD = new Date(end.getTime() - mins * 60_000);
      startedAt = startD.toISOString();
      endedAt = end.toISOString();
    }
    if (!startedAt || !endedAt) {
      alert("Missing start/end times.");
      return;
    }

    const carryIds = carryUnchecked
      ? todoState
          .filter((t) => !t.done && !t.id.startsWith("tmp-"))
          .map((t) => t.id)
      : [];

    startTx(async () => {
      try {
        await completeSession({
          sessionId: session?.id ?? null,
          trackId,
          sessionTypeId,
          startedAt,
          endedAt,
          improved,
          stillBroken,
          notesMd,
          energyRating: energy,
          enjoymentRating: enjoyment,
          newBottleneckDescription: bottleneckDesc,
          newBottleneckCategory: bottleneckDesc ? bottleneckCat : undefined,
          carryOverTodoIds: carryIds,
          todos: todoState
            .map((t) => ({
              description: t.description.trim(),
              done: t.done,
            }))
            .filter((t) => t.description.length > 0),
        });
        onCompleted?.();
        onOpenChange(false);
        router.refresh();
        if (redirectTo) router.push(redirectTo);
      } catch (e) {
        alert((e as Error).message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete session</DialogTitle>
          <DialogDescription>
            Close the loop — what worked, what&apos;s next, how did it feel?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-mono text-base">
              {formatDuration(computedDurationSec)}
            </span>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="manual">Override duration (minutes)</Label>
            <Input
              id="manual"
              inputMode="numeric"
              value={manualMinutes}
              onChange={(e) =>
                setManualMinutes(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder={
                draft
                  ? `${Math.round(draft.durationSeconds / 60)}`
                  : "Enter minutes"
              }
            />
          </div>

          <div className="grid gap-2">
            <Label>Session type</Label>
            <SessionTypePicker
              types={sessionTypes}
              value={sessionTypeId}
              onChange={setSessionTypeId}
            />
          </div>

          <div className="grid gap-2">
            <Label>Track</Label>
            <TrackPicker
              tracks={tracks}
              value={trackId}
              onChange={setTrackId}
            />
          </div>

          {todoState.length > 0 && (
            <div className="grid gap-2">
              <Label>Todos</Label>
              <ul className="flex flex-col gap-1">
                {todoState.map((t, i) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                  >
                    <Checkbox
                      checked={t.done}
                      onCheckedChange={(v) => {
                        const next = [...todoState];
                        next[i] = { ...t, done: v === true };
                        setTodoState(next);
                      }}
                    />
                    <span
                      className={cn(
                        "flex-1",
                        t.done && "text-muted-foreground line-through",
                      )}
                    >
                      {t.description}
                    </span>
                  </li>
                ))}
              </ul>
              {todoState.some((t) => !t.done) && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={carryUnchecked}
                    onCheckedChange={(v) => setCarryUnchecked(v === true)}
                  />
                  Carry unchecked todos into a new planned session next week
                </label>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <RatingPicker
              label="Energy"
              value={energy}
              onChange={setEnergy}
              hint="How energized did you feel?"
            />
            <RatingPicker
              label="Enjoyment"
              value={enjoyment}
              onChange={setEnjoyment}
              hint="How much did you enjoy it?"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="improved">What improved?</Label>
            <Textarea
              id="improved"
              value={improved}
              onChange={(e) => setImproved(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stillBroken">What&apos;s still broken?</Label>
            <Textarea
              id="stillBroken"
              value={stillBroken}
              onChange={(e) => setStillBroken(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes for next session</Label>
            <Textarea
              id="notes"
              value={notesMd}
              onChange={(e) => setNotesMd(e.target.value)}
              rows={2}
              placeholder="What you want to do next time…"
            />
          </div>

          {trackId && (
            <div className="grid gap-2">
              <Label htmlFor="bn">New bottleneck (optional)</Label>
              <Textarea
                id="bn"
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
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={pending || computedDurationSec <= 0}
          >
            Save session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RatingPicker({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={cn(
              "h-8 w-8 rounded-md border text-sm font-medium transition-colors",
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface hover:bg-surface-2",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  }
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
