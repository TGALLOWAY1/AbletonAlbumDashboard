"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { TrackPicker } from "@/components/calendar/track-picker";
import { SessionTypePicker } from "@/components/calendar/session-type-picker";
import { completeSession } from "@/app/actions/sessions";
import {
  BOTTLENECK_CATEGORIES,
  BOTTLENECK_LABELS,
  type SessionTypeRow,
  type TrackRow,
} from "@/lib/types";

export function ManualSessionEntry({
  tracks,
  sessionTypes,
  trackId: fixedTrackId = null,
  variant = "desktop",
}: {
  tracks: TrackRow[];
  sessionTypes: SessionTypeRow[];
  trackId?: string | null;
  variant?: "desktop" | "mobile";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size={variant === "mobile" ? "lg" : "md"}
        className={variant === "mobile" ? "w-full" : undefined}
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Log past session
      </Button>
      <ManualSessionDialog
        open={open}
        onOpenChange={setOpen}
        tracks={tracks}
        sessionTypes={sessionTypes}
        fixedTrackId={fixedTrackId}
      />
    </>
  );
}

function defaultStart() {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

function ManualSessionDialog({
  open,
  onOpenChange,
  tracks,
  sessionTypes,
  fixedTrackId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracks: TrackRow[];
  sessionTypes: SessionTypeRow[];
  fixedTrackId: string | null;
}) {
  const router = useRouter();
  const [trackId, setTrackId] = useState<string | null>(fixedTrackId);
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(null);
  const [start, setStart] = useState<string>(defaultStart());
  const [minutes, setMinutes] = useState<string>("");
  const [improved, setImproved] = useState("");
  const [stillBroken, setStillBroken] = useState("");
  const [notesMd, setNotesMd] = useState("");
  const [newBottleneckDescription, setNewBottleneckDescription] = useState("");
  const [newBottleneckCategory, setNewBottleneckCategory] =
    useState<string>("arrangement");
  const [pending, startTx] = useTransition();

  const durationSec = useMemo(() => {
    if (!/^\d+$/.test(minutes)) return 0;
    return parseInt(minutes, 10) * 60;
  }, [minutes]);

  const startValid = !Number.isNaN(new Date(start).getTime());
  // Track is optional; a track-less session must be anchored by a session type.
  const hasAnchor = !!trackId || !!sessionTypeId;
  const canSave = hasAnchor && startValid && durationSec > 0 && !!start;

  const reset = () => {
    setTrackId(fixedTrackId);
    setSessionTypeId(null);
    setStart(defaultStart());
    setMinutes("");
    setImproved("");
    setStillBroken("");
    setNotesMd("");
    setNewBottleneckDescription("");
    setNewBottleneckCategory("arrangement");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = () => {
    if (!canSave) return;
    const startDate = new Date(start);
    const startedAt = startDate.toISOString();
    const endedAt = new Date(startDate.getTime() + durationSec * 1000).toISOString();

    startTx(async () => {
      try {
        await completeSession({
          sessionId: null,
          trackId,
          sessionTypeId,
          startedAt,
          endedAt,
          improved,
          stillBroken,
          notesMd,
          newBottleneckDescription,
          newBottleneckCategory: newBottleneckDescription
            ? newBottleneckCategory
            : undefined,
        });
        reset();
        onOpenChange(false);
        router.refresh();
      } catch (e) {
        alert((e as Error).message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Log past session</DialogTitle>
          <DialogDescription>
            Backfill a session you forgot to time — pick when it happened and how
            long it lasted.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!fixedTrackId && (
            <div className="grid gap-2">
              <Label>Track</Label>
              <TrackPicker tracks={tracks} value={trackId} onChange={setTrackId} />
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
              <Label>
                Session type{trackId || fixedTrackId ? " (optional)" : ""}
              </Label>
              <SessionTypePicker
                types={sessionTypes}
                value={sessionTypeId}
                onChange={setSessionTypeId}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="manual-improved">What improved?</Label>
            <Textarea
              id="manual-improved"
              value={improved}
              onChange={(e) => setImproved(e.target.value)}
              rows={2}
              placeholder="Drum bus is tighter, vocals sit better…"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="manual-stillBroken">What&apos;s still broken?</Label>
            <Textarea
              id="manual-stillBroken"
              value={stillBroken}
              onChange={(e) => setStillBroken(e.target.value)}
              rows={2}
              placeholder="Drop transition feels abrupt…"
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

          <div className="grid gap-2">
            <Label htmlFor="manual-bottleneck">New bottleneck (optional)</Label>
            <Textarea
              id="manual-bottleneck"
              value={newBottleneckDescription}
              onChange={(e) => setNewBottleneckDescription(e.target.value)}
              rows={2}
              placeholder="Replaces the current bottleneck if filled in."
            />
            {newBottleneckDescription && (
              <div className="flex flex-wrap gap-1.5">
                {BOTTLENECK_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewBottleneckCategory(c)}
                  >
                    <Badge
                      variant={
                        newBottleneckCategory === c ? "warning" : "default"
                      }
                      className="cursor-pointer"
                    >
                      {BOTTLENECK_LABELS[c]}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
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
            Save session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  }
  return `${m}m`;
}
