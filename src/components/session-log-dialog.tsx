"use client";

import { useState, useTransition } from "react";
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
import { logSession } from "@/app/actions/sessions";
import {
  BOTTLENECK_CATEGORIES,
  BOTTLENECK_LABELS,
  type ActionRow,
} from "@/lib/types";

export type SessionDraft = {
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
};

export function SessionLogDialog({
  open,
  onOpenChange,
  trackId,
  primaryAction,
  draft,
  redirectTo = "/",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  primaryAction: ActionRow | null;
  draft: SessionDraft | null;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [improved, setImproved] = useState("");
  const [stillBroken, setStillBroken] = useState("");
  const [newBottleneckDescription, setNewBottleneckDescription] = useState("");
  const [newBottleneckCategory, setNewBottleneckCategory] =
    useState<string>("arrangement");
  const [completeActionFlag, setCompleteActionFlag] = useState(false);
  const [manualMinutes, setManualMinutes] = useState<string>("");
  const [pending, start] = useTransition();

  const reset = () => {
    setImproved("");
    setStillBroken("");
    setNewBottleneckDescription("");
    setNewBottleneckCategory("arrangement");
    setCompleteActionFlag(false);
    setManualMinutes("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const computedDurationSec = (() => {
    if (manualMinutes && /^\d+$/.test(manualMinutes)) {
      return parseInt(manualMinutes, 10) * 60;
    }
    return draft?.durationSeconds ?? 0;
  })();
  const durationLabel = formatDuration(computedDurationSec);

  const submit = () => {
    if (!draft) return;
    let startedAt = draft.startedAt;
    let endedAt = draft.endedAt;
    if (manualMinutes && /^\d+$/.test(manualMinutes)) {
      const mins = parseInt(manualMinutes, 10);
      const end = new Date();
      const start = new Date(end.getTime() - mins * 60_000);
      startedAt = start.toISOString();
      endedAt = end.toISOString();
    }

    start(async () => {
      try {
        await logSession({
          trackId,
          actionId: primaryAction?.id ?? null,
          startedAt,
          endedAt,
          improved,
          stillBroken,
          newBottleneckDescription,
          newBottleneckCategory: newBottleneckDescription
            ? newBottleneckCategory
            : undefined,
          completeAction: completeActionFlag && !!primaryAction,
        });
        reset();
        onOpenChange(false);
        router.push(redirectTo);
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
          <DialogTitle>Log session</DialogTitle>
          <DialogDescription>
            Close the loop — what changed, and what&apos;s next?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-mono text-base">{durationLabel}</span>
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

          {primaryAction && (
            <div className="rounded-md border border-border bg-surface-2 p-3 text-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Worked on
              </div>
              <div className="mt-1">{primaryAction.description}</div>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <Checkbox
                  checked={completeActionFlag}
                  onCheckedChange={(v) => setCompleteActionFlag(v === true)}
                />
                Mark this action complete
              </label>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="improved">What improved?</Label>
            <Textarea
              id="improved"
              value={improved}
              onChange={(e) => setImproved(e.target.value)}
              rows={2}
              placeholder="Drum bus is tighter, vocals sit better…"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stillBroken">What&apos;s still broken?</Label>
            <Textarea
              id="stillBroken"
              value={stillBroken}
              onChange={(e) => setStillBroken(e.target.value)}
              rows={2}
              placeholder="Drop transition feels abrupt…"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="newBottleneck">New bottleneck (optional)</Label>
            <Textarea
              id="newBottleneck"
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
            Discard
          </Button>
          <Button onClick={submit} disabled={pending || computedDurationSec <= 0}>
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
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  }
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
