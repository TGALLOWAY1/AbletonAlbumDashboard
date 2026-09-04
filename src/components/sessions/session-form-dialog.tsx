"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
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
import { RatingPicker } from "@/components/ui/rating-picker";
import { TrackPicker, type PickableTrack } from "@/components/track-picker";
import { SessionTypePicker } from "@/components/session-type-picker";
import { completeSession, updateSession } from "@/app/actions/sessions";
import { useToast } from "@/components/toast";
import { formatDuration } from "@/lib/utils";
import { type SessionTypeRow } from "@/lib/types";

/**
 * The fields of a logged session this form owns. Deliberately not `SessionRow`:
 * the callers that prefill it (the history list, the track log) each select a
 * different slice of the table, and the form only ever writes these seven
 * things.
 *
 * `session_activities` is **not** among them — the per-activity minutes are
 * only collected by the focus runner's completion screen, so there is no
 * control here to edit them with and `updateSession` is called without an
 * `activities` array, which leaves the breakdown a session was logged with
 * untouched. Editing activities is a follow-up.
 */
export type EditableSession = {
  id: string;
  trackId: string | null;
  sessionTypeId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  notesMd: string | null;
  progressImpactRating: number | null;
  enjoymentRating: number | null;
};

function defaultStart() {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

/** ISO timestamp → the value a `datetime-local` input wants, in local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return defaultStart();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return defaultStart();
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

function minutesBetween(startedAt: string | null, endedAt: string | null) {
  if (!startedAt || !endedAt) return "";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (Number.isNaN(ms) || ms <= 0) return "";
  return String(Math.round(ms / 60000));
}

/**
 * One form for both ways a session gets written by hand: backfilling one that
 * was never timed, and correcting one that was.
 *
 * They differ only in which server action they call and what the buttons say —
 * the shape of a session is the same either way, and forking the form is how
 * the two would drift into disagreeing about what a session needs (the
 * "a session with no track needs a type" rule below, say). Pass `session` to
 * edit it; omit it to log a new one.
 *
 * State is seeded from props on mount, so callers editing a row should key the
 * dialog by session id (or mount it only while open) to reseed it.
 */
export function SessionFormDialog({
  open,
  onOpenChange,
  tracks,
  sessionTypes,
  fixedTrackId = null,
  session = null,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Omit to leave the session on the track it already has. The track log pane
   * does: it is a single track's timeline, and it would have to fetch the
   * whole library to draw a picker that lets you move a session off it.
   */
  tracks?: PickableTrack[];
  sessionTypes: SessionTypeRow[];
  fixedTrackId?: string | null;
  session?: EditableSession | null;
  onSaved?: () => void;
}) {
  const editing = session !== null;
  const router = useRouter();
  const [trackId, setTrackId] = useState<string | null>(
    session?.trackId ?? fixedTrackId,
  );
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(
    session?.sessionTypeId ?? null,
  );
  const [start, setStart] = useState<string>(
    editing ? toLocalInput(session.startedAt) : defaultStart(),
  );
  const [minutes, setMinutes] = useState<string>(
    editing ? minutesBetween(session.startedAt, session.endedAt) : "",
  );
  const [progressImpact, setProgressImpact] = useState<number | null>(
    session?.progressImpactRating ?? null,
  );
  const [enjoyment, setEnjoyment] = useState<number | null>(
    session?.enjoymentRating ?? null,
  );
  const [notesMd, setNotesMd] = useState(session?.notesMd ?? "");
  const [pending, startTx] = useTransition();
  const { toast } = useToast();

  const durationSec = useMemo(() => {
    if (!/^\d+$/.test(minutes)) return 0;
    return parseInt(minutes, 10) * 60;
  }, [minutes]);

  const startValid = !Number.isNaN(new Date(start).getTime());
  // Track is optional; a track-less session must be anchored by a session type.
  // Four hours of general studio work is a real session, but "4 hours of
  // something" is not — the type is what makes it legible later.
  const showTrackPicker = !!tracks && !fixedTrackId;
  const hasTrack = !!trackId || !!fixedTrackId;
  const hasAnchor = hasTrack || !!sessionTypeId;
  const canSave = hasAnchor && startValid && durationSec > 0 && !!start;

  // Why Save is greyed out. The dialog used to disable the button silently,
  // which read as "you must pick a track" — the one thing that is not true.
  const blockedReason =
    !startValid || !start
      ? "Pick when the session started."
      : durationSec <= 0
        ? "Enter how many minutes it lasted."
        : !hasAnchor
          ? "Pick a session type — a session with no track needs one to mean anything later."
          : null;

  const reset = () => {
    setTrackId(session?.trackId ?? fixedTrackId);
    setSessionTypeId(session?.sessionTypeId ?? null);
    setStart(editing ? toLocalInput(session.startedAt) : defaultStart());
    setMinutes(editing ? minutesBetween(session.startedAt, session.endedAt) : "");
    setProgressImpact(session?.progressImpactRating ?? null);
    setEnjoyment(session?.enjoymentRating ?? null);
    setNotesMd(session?.notesMd ?? "");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = () => {
    if (!canSave) return;
    const startDate = new Date(start);
    const startedAt = startDate.toISOString();
    const endedAt = new Date(
      startDate.getTime() + durationSec * 1000,
    ).toISOString();

    startTx(async () => {
      try {
        if (editing) {
          await updateSession({
            id: session.id,
            trackId,
            sessionTypeId,
            startedAt,
            endedAt,
            progressImpactRating: progressImpact,
            enjoymentRating: enjoyment,
            notesMd,
          });
        } else {
          await completeSession({
            trackId,
            sessionTypeId,
            startedAt,
            endedAt,
            progressImpact,
            enjoymentRating: enjoyment,
            notesMd,
          });
        }
        if (!editing) reset();
        onOpenChange(false);
        onSaved?.();
        router.refresh();
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit session" : "Log past session"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Fix what was logged. Every figure on the dashboard is measured off these rows, so the correction lands everywhere."
              : "Backfill a session you forgot to time — pick when it happened and how long it lasted."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {showTrackPicker && (
            <div className="grid gap-2">
              <Label>Track (optional)</Label>
              <TrackPicker
                tracks={tracks}
                value={trackId}
                onChange={setTrackId}
              />
              <p className="text-xs text-muted-foreground">
                Leave this empty for general studio work — time that didn’t move
                one song but set up the next session on all of them.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="manual-start">When (start)</Label>
              <Input
                id="manual-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="manual-minutes">Duration (minutes)</Label>
              <Input
                id="manual-minutes"
                inputMode="numeric"
                value={minutes}
                onChange={(e) =>
                  setMinutes(e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="e.g. 90"
              />
            </div>
          </div>

          {durationSec > 0 && (
            <div className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-mono text-base">
                {formatDuration(durationSec)}
              </span>
            </div>
          )}

          {sessionTypes.length > 0 && (
            <div className="grid gap-2">
              <Label>Session type{hasTrack ? " (optional)" : ""}</Label>
              <SessionTypePicker
                types={sessionTypes}
                value={sessionTypeId}
                onChange={setSessionTypeId}
              />
            </div>
          )}

          {/* Same two scales as the focus log page — one outcome schema for
              every completion path. */}
          <div className="grid grid-cols-2 gap-4">
            <RatingPicker
              label="Progress / Impact"
              value={progressImpact}
              onChange={setProgressImpact}
              hint={
                hasTrack
                  ? "How much did the track move?"
                  : "How much did this move things forward?"
              }
            />
            <RatingPicker
              label="Enjoyment"
              value={enjoyment}
              onChange={setEnjoyment}
              hint="How much did you enjoy it?"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="manual-notes">Notes for next session</Label>
            <Textarea
              id="manual-notes"
              value={notesMd}
              onChange={(e) => setNotesMd(e.target.value)}
              rows={3}
              placeholder="What you want to do next time…"
            />
          </div>

          {blockedReason && (
            <p className="text-xs text-muted-foreground">{blockedReason}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !canSave}>
            {editing ? "Save changes" : "Save session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
