"use client";

import { useMemo, useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSunoExperiment } from "@/app/actions/suno-experiments";
import { buildSunoPrompt } from "@/lib/suno-prompt";
import { useToast } from "@/components/toast";
import type { VersionRow } from "@/lib/types";

export type SunoTrackMeta = {
  trackId: string;
  trackName: string;
  genre: string | null;
  bpm: number | null;
  songKey: string | null;
};

/** Create-experiment form: required goal, optional preserve/change/avoid,
 * source-version picker, live prompt preview. Controlled by the parent. */
export function SunoExperimentDialog({
  meta,
  versions,
  defaultSourceVersionId,
  open,
  onOpenChange,
}: {
  meta: SunoTrackMeta;
  versions: VersionRow[];
  defaultSourceVersionId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Suno variations aren't source material — round-trips start from your own
  // bounces so lineage stays one level deep in V1.
  const sourceVersions = useMemo(
    () => versions.filter((v) => v.source !== "suno"),
    [versions],
  );
  const [sourceVersionId, setSourceVersionId] = useState(
    defaultSourceVersionId ?? sourceVersions[0]?.id ?? "",
  );
  const [goal, setGoal] = useState("");
  const [preserve, setPreserve] = useState("");
  const [change, setChange] = useState("");
  const [avoid, setAvoid] = useState("");
  const [pending, start] = useTransition();
  const { toast } = useToast();

  const preview = buildSunoPrompt({
    genre: meta.genre,
    bpm: meta.bpm,
    songKey: meta.songKey,
    goal: goal.trim() || "…",
    preserve,
    change,
    avoid,
  });

  const submit = () => {
    if (!goal.trim() || !sourceVersionId) return;
    start(async () => {
      try {
        await createSunoExperiment({
          trackId: meta.trackId,
          sourceVersionId,
          goal,
          preserve: preserve.trim() || undefined,
          change: change.trim() || undefined,
          avoid: avoid.trim() || undefined,
        });
        onOpenChange(false);
        setGoal("");
        setPreserve("");
        setChange("");
        setAvoid("");
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Get Suno variations</DialogTitle>
          <DialogDescription>
            One bounded question per round-trip. Write the goal first — it
            keeps the session from becoming a rabbit hole.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suno-source">Source version</Label>
            <Select value={sourceVersionId} onValueChange={setSourceVersionId}>
              <SelectTrigger id="suno-source">
                <SelectValue placeholder="Pick a bounce" />
              </SelectTrigger>
              <SelectContent>
                {sourceVersions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suno-goal">Goal (required)</Label>
            <Input
              id="suno-goal"
              placeholder="e.g. A stronger second-drop variation"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              maxLength={300}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suno-preserve">What should stay the same?</Label>
            <Textarea
              id="suno-preserve"
              placeholder="halftime groove, F minor tonal center, main bass rhythm"
              value={preserve}
              onChange={(e) => setPreserve(e.target.value)}
              maxLength={200}
              rows={2}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suno-change">What should change?</Label>
            <Textarea
              id="suno-change"
              placeholder="a more melodic answering phrase, more contrast from Drop 1"
              value={change}
              onChange={(e) => setChange(e.target.value)}
              maxLength={200}
              rows={2}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suno-avoid">What should Suno avoid?</Label>
            <Textarea
              id="suno-avoid"
              placeholder="vocals, guitars, new chord progression"
              value={avoid}
              onChange={(e) => setAvoid(e.target.value)}
              maxLength={200}
              rows={2}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Prompt preview</Label>
            <pre className="whitespace-pre-wrap rounded-md border border-border bg-surface-2 p-3 text-xs text-muted-foreground">
              {preview}
            </pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={pending || !goal.trim() || !sourceVersionId}
          >
            {pending ? "Creating…" : "Create experiment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
