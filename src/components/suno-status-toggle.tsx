"use client";

import * as React from "react";
import { Check, Sparkles } from "lucide-react";
import { setTrackSunoStatus } from "@/app/actions/tracks";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { nextSunoStatus, type SunoStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The track's standing "Suno" marker — one click flips it between todo and
 * done, saving immediately (no separate save step), same as
 * `<TrackAlbumSelect>`.
 *
 * `variant` controls sizing only, per CLAUDE.md's shared-component rule:
 *  - `chip`  — badge-sized, for track cards and rows on either platform.
 *  - `field` — a labelled row with a full tap target, for the track detail
 *              surfaces (`/tracks/[id]` and `/m/[trackId]`).
 */
export function SunoStatusToggle({
  trackId,
  status,
  variant = "chip",
  className,
}: {
  trackId: string;
  status: SunoStatus;
  variant?: "chip" | "field";
  className?: string;
}) {
  const [value, setValue] = React.useState<SunoStatus>(status);
  const [prevStatus, setPrevStatus] = React.useState<SunoStatus>(status);
  const [pending, start] = React.useTransition();
  const { toast } = useToast();

  // Re-sync when the server-provided status changes underneath us (a
  // revalidation, or a navigation to another track), per React's "adjust
  // state during render" pattern.
  if (status !== prevStatus) {
    setPrevStatus(status);
    setValue(status);
  }

  const done = value === "done";

  function toggle() {
    if (pending) return;
    const previous = value;
    const next = nextSunoStatus(previous);
    setValue(next);
    start(async () => {
      try {
        await setTrackSunoStatus(trackId, next);
        toast(next === "done" ? "Suno marked done" : "Suno marked not done");
      } catch (e) {
        setValue(previous);
        toast((e as Error).message);
      }
    });
  }

  if (variant === "field") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2",
          className,
        )}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">Suno</p>
          <p className="text-xs text-muted-foreground">
            {done ? "Done" : "Not done yet"}
          </p>
        </div>
        <Button
          type="button"
          variant={done ? "default" : "outline"}
          // h-11 keeps the tap target comfortable on the mobile surface.
          className="h-11 shrink-0 px-4"
          aria-pressed={done}
          disabled={pending}
          onClick={toggle}
        >
          {done ? (
            <Check className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {done ? "Done" : "Mark done"}
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={done}
      aria-label={done ? "Suno done — mark not done" : "Mark Suno done"}
      title={done ? "Suno done — click to undo" : "Mark Suno done"}
      disabled={pending}
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-60",
        done
          ? "border-primary/30 bg-primary/15 text-primary hover:bg-primary/25"
          : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {done ? (
        <Check className="h-3 w-3 shrink-0" />
      ) : (
        <Sparkles className="h-3 w-3 shrink-0" />
      )}
      Suno
    </button>
  );
}
