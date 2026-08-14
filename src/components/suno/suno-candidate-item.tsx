"use client";

import { useState, useTransition } from "react";
import { Pause, Play, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  keepCandidate,
  mineCandidate,
  rejectCandidate,
  unkeepCandidate,
} from "@/app/actions/suno-experiments";
import {
  formatDuration,
  useWaveform,
} from "@/components/audio/use-waveform";
import { useToast } from "@/components/toast";
import type { SunoCandidateWithVersion } from "@/lib/data/suno";
import type { SunoExperimentStatus } from "@/lib/suno";

/** Parses "m:ss" or plain seconds into seconds; null for blank/invalid. */
function parseTimestamp(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const colon = trimmed.match(/^(\d+):([0-5]?\d)$/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);
  const seconds = Number(trimmed);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

function decisionBadge(decision: string) {
  switch (decision) {
    case "keep":
      return <Badge variant="primary">Keeper</Badge>;
    case "mine":
      return <Badge variant="accent">Mined</Badge>;
    case "reject":
      return <Badge variant="danger">Rejected</Badge>;
    default:
      return null;
  }
}

export function SunoCandidateItem({
  candidate,
  trackId,
  experimentStatus,
  hasKeeper,
}: {
  candidate: SunoCandidateWithVersion;
  trackId: string;
  experimentStatus: SunoExperimentStatus;
  /** Whether some other candidate is already the keeper. */
  hasKeeper: boolean;
}) {
  const version = candidate.version;
  const { containerRef, ready, playing, duration, toggle } = useWaveform(
    version?.storage_path ?? "",
    version?.duration_seconds ?? null,
  );
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<"keep" | "mine" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [task, setTask] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const { toast } = useToast();

  const reviewable =
    (experimentStatus === "reviewing" || experimentStatus === "selected") &&
    candidate.decision === "unreviewed";

  const closeDialog = () => {
    setDialog(null);
    setNote("");
    setTask("");
    setStartAt("");
    setEndAt("");
  };

  const run = (fn: () => Promise<void>) => {
    start(async () => {
      try {
        await fn();
        closeDialog();
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  const submitKeep = () => {
    // Replacing an existing keeper is a real decision — confirm it here
    // instead of round-tripping through the server error.
    if (hasKeeper && !confirm("Replace the current keeper with this candidate?"))
      return;
    run(() =>
      keepCandidate({
        candidateId: candidate.id,
        trackId,
        note: note.trim() || undefined,
        taskDescription: task.trim() || undefined,
        replaceExistingKeeper: hasKeeper,
      }),
    );
  };

  const submitMine = () => {
    const startSeconds = parseTimestamp(startAt);
    const endSeconds = parseTimestamp(endAt);
    run(() =>
      mineCandidate({
        candidateId: candidate.id,
        trackId,
        note: note.trim(),
        startSeconds,
        endSeconds,
        taskDescription: task.trim(),
      }),
    );
  };

  const submitReject = () => {
    run(() =>
      rejectCandidate({
        candidateId: candidate.id,
        trackId,
        note: note.trim() || undefined,
      }),
    );
  };

  const unkeep = () => {
    run(() => unkeepCandidate(candidate.id, trackId));
  };

  if (!version) return null;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-3">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={toggle}
          disabled={!ready || pending}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <div className="truncate text-sm font-medium">
                {version.label}
              </div>
              {decisionBadge(candidate.decision)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDuration(duration)}
            </div>
          </div>
          <div ref={containerRef} className="mt-1 w-full" />
        </div>
      </div>

      {candidate.decision_note && (
        <p className="text-xs text-muted-foreground">
          {candidate.decision === "mine" &&
            candidate.mine_timestamp_start != null && (
              <span className="mr-1 font-medium">
                {formatDuration(candidate.mine_timestamp_start)}
                {candidate.mine_timestamp_end != null &&
                  `–${formatDuration(candidate.mine_timestamp_end)}`}
              </span>
            )}
          {candidate.decision_note}
        </p>
      )}

      {reviewable && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setDialog("keep")} disabled={pending}>
            Keep
          </Button>
          <Button
            size="sm"
            variant="accent"
            onClick={() => setDialog("mine")}
            disabled={pending}
          >
            Mine for parts
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialog("reject")}
            disabled={pending}
          >
            Reject
          </Button>
        </div>
      )}

      {candidate.decision === "keep" && experimentStatus === "selected" && (
        <div>
          <Button size="sm" variant="ghost" onClick={unkeep} disabled={pending}>
            <Undo2 className="h-3.5 w-3.5" />
            Remove keeper
          </Button>
        </div>
      )}

      {/* Keep dialog */}
      <Dialog open={dialog === "keep"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keep this candidate</DialogTitle>
            <DialogDescription>
              It becomes the experiment&apos;s keeper — the idea you intend to
              bring into Ableton.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="keep-note">Why it works (optional)</Label>
              <Textarea
                id="keep-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="keep-task">
                What needs to happen in Ableton? (optional — becomes a task)
              </Label>
              <Textarea
                id="keep-task"
                placeholder="e.g. Import the variation and compare against v12"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                maxLength={300}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={submitKeep} disabled={pending}>
              {pending ? "Saving…" : "Keep"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mine dialog */}
      <Dialog open={dialog === "mine"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mine for parts</DialogTitle>
            <DialogDescription>
              Take the useful element, leave the rest. Mining always creates an
              Ableton task.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mine-note">What is worth keeping?</Label>
              <Textarea
                id="mine-note"
                placeholder="e.g. Bass rhythm in the final phrase"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mine-start">Start (m:ss, optional)</Label>
                <Input
                  id="mine-start"
                  placeholder="0:42"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mine-end">End (m:ss, optional)</Label>
                <Input
                  id="mine-end"
                  placeholder="0:47"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mine-task">
                What should you do with it in Ableton?
              </Label>
              <Textarea
                id="mine-task"
                placeholder="e.g. Recreate this rhythm with my current bass patch in bars 57–60"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                maxLength={300}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={submitMine}
              disabled={pending || !note.trim() || !task.trim()}
            >
              {pending ? "Saving…" : "Mine it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog
        open={dialog === "reject"}
        onOpenChange={(o) => !o && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this candidate</DialogTitle>
            <DialogDescription>
              Its audio is cleaned up when the experiment closes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reject-note">Why? (optional)</Label>
            <Textarea
              id="reject-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant="danger" onClick={submitReject} disabled={pending}>
              {pending ? "Saving…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
