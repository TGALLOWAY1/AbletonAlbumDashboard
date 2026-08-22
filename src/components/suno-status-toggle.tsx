"use client";

import * as React from "react";
import { setTrackSunoStatus } from "@/app/actions/tracks";
import { useToast } from "@/components/toast";
import {
  nextSunoStatus,
  SUNO_STATUS_EMOJI,
  SUNO_STATUS_LABELS,
  SUNO_STATUSES,
  type SunoStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The track's standing "Suno" marker — not done / complete / tried but
 * errored, saving immediately (no separate save step), same as
 * `<TrackAlbumSelect>`.
 *
 * `variant` controls sizing and affordance only, per CLAUDE.md's
 * shared-component rule:
 *  - `chip`  — badge-sized, for track cards and rows on either platform. One
 *              tap target, so it cycles through the states.
 *  - `field` — a labelled row of full-size buttons, one per state, for the
 *              track detail surfaces (`/tracks/[id]` and `/m/[trackId]`).
 *              With three states a cycling button would hide two of them
 *              behind repeat taps, and there's room here not to.
 */

/** Per-state chip colours: muted until something has happened to the track. */
const CHIP_TONE: Record<SunoStatus, string> = {
  todo: "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
  done: "border-primary/30 bg-primary/15 text-primary hover:bg-primary/25",
  error: "border-warning/40 bg-warning/15 text-warning hover:bg-warning/25",
};

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

  function save(next: SunoStatus) {
    if (pending || next === value) return;
    const previous = value;
    setValue(next);
    start(async () => {
      // The action reports failure in its return value, not by throwing: React
      // strips the message off anything a server action throws before the
      // rejection gets here, so a thrown message would toast as the generic
      // "An error occurred in the Server Components render". The catch stays
      // for the cases that genuinely reject — a dropped connection, a failed
      // fetch — where there is no result to read.
      try {
        const result = await setTrackSunoStatus(trackId, next);
        if (result.error) {
          setValue(previous);
          toast(result.error);
          return;
        }
        toast(`Suno: ${SUNO_STATUS_LABELS[next]}`);
      } catch {
        setValue(previous);
        toast("Could not reach the server. Please try again.");
      }
    });
  }

  if (variant === "field") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2",
          className,
        )}
        role="group"
        aria-label="Suno status"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">Suno</p>
          <p className="text-xs text-muted-foreground">
            {SUNO_STATUS_LABELS[value]}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {SUNO_STATUSES.map((option) => {
            const active = option === value;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                disabled={pending}
                onClick={() => save(option)}
                // h-11 keeps the tap target comfortable on the mobile surface.
                className={cn(
                  "inline-flex h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors disabled:opacity-60",
                  active
                    ? CHIP_TONE[option]
                    : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
                )}
              >
                <span aria-hidden>{SUNO_STATUS_EMOJI[option]}</span>
                {SUNO_STATUS_LABELS[option]}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const next = nextSunoStatus(value);
  const label = `Suno: ${SUNO_STATUS_LABELS[value]} — click for ${SUNO_STATUS_LABELS[next]}`;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() => save(next)}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-60",
        CHIP_TONE[value],
        className,
      )}
    >
      <span aria-hidden>{SUNO_STATUS_EMOJI[value]}</span>
      Suno
    </button>
  );
}
