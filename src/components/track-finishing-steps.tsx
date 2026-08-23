"use client";

import { useOptimistic, useRef, useTransition } from "react";
import { format } from "date-fns";
import {
  Check,
  Download,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { setFinishingStep } from "@/app/actions/finishing-steps";
import { useToast } from "@/components/toast";
import {
  FINISHING_STEP_LABELS,
  type FinishingStep,
  type FinishingStepKey,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The three-row hand-off checklist drawn straight on a track card.
 *
 * Ticking writes through `setFinishingStep`, so the card is a working surface
 * rather than a read-out — the whole point is not having to open the track to
 * close out the last mile.
 *
 * `variant` controls sizing only (CLAUDE.md's shared-component rule): `card`
 * is the 44px-tap-target treatment for the large mobile card, `compact` the
 * denser one for desktop widths.
 */

const STEP_ICON: Record<FinishingStepKey, LucideIcon> = {
  suno_variations: Sparkles,
  stems_midi: Download,
  ableton_cleanup: SlidersHorizontal,
};

// Restrained: the two steps that produce something get an accent, the tidy-up
// stays neutral. Icons carry the colour so the labels can all read as plain
// text.
const STEP_ICON_TONE: Record<FinishingStepKey, string> = {
  suno_variations: "text-primary",
  stems_midi: "text-accent",
  ableton_cleanup: "text-muted-foreground",
};

type Variant = "card" | "compact";

const SIZING: Record<
  Variant,
  { row: string; hit: string; box: string; icon: string; label: string; date: string }
> = {
  // The 44px tap target is wider than the 22px box it holds, so the hit area
  // is pulled left by the difference — the box lines up with the card's text
  // column while the target still spills into the padding.
  card: {
    row: "flex min-h-[44px] items-center gap-2.5",
    hit: "-ml-[11px] flex h-11 w-11 shrink-0 items-center justify-center",
    box: "h-[22px] w-[22px] rounded-[6px]",
    icon: "h-[18px] w-[18px] shrink-0",
    label: "min-w-0 flex-1 truncate text-[15px] leading-snug",
    date: "shrink-0 text-[13px] tabular-nums",
  },
  compact: {
    row: "flex min-h-[34px] items-center gap-2",
    hit: "-ml-[7px] flex h-8 w-8 shrink-0 items-center justify-center",
    box: "h-[18px] w-[18px] rounded-[5px]",
    icon: "h-4 w-4 shrink-0",
    label: "min-w-0 flex-1 truncate text-sm leading-snug",
    date: "shrink-0 text-xs tabular-nums",
  },
};

export function TrackFinishingSteps({
  trackId,
  steps,
  variant = "card",
  className,
}: {
  trackId: string;
  /** Always three, in order — see `finishingStepsFromRows`. */
  steps: FinishingStep[];
  variant?: Variant;
  className?: string;
}) {
  const sizing = SIZING[variant];
  const [optimistic, applyOptimistic] = useOptimistic(
    steps,
    (state: FinishingStep[], next: FinishingStep) =>
      state.map((s) => (s.key === next.key ? next : s)),
  );
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  // One write in flight per row. Each write sends an absolute state, not a
  // flip, so two taps in quick succession would race: nothing orders the two
  // requests, and the first can settle last and leave the row saved opposite
  // to what the card shows. A ref rather than state because the guard has to
  // hold within a single tick, before React has re-rendered.
  const inFlight = useRef<Set<FinishingStepKey>>(new Set());

  const toggle = (step: FinishingStep) => {
    if (inFlight.current.has(step.key)) return;
    inFlight.current.add(step.key);
    const complete = step.completedAt === null;
    startTransition(async () => {
      applyOptimistic({
        key: step.key,
        completedAt: complete ? new Date().toISOString() : null,
      });
      try {
        const result = await setFinishingStep(trackId, step.key, complete);
        if (result?.error) toast(result.error);
      } catch (e) {
        // `setFinishingStep` returns its own failures, so reaching here means
        // the request never got an answer — a dropped connection, or a throw
        // before the action's error handling. Without this the transition
        // rejects unhandled and the tick silently rolls back with no toast.
        toast(
          e instanceof Error && e.message
            ? e.message
            : "Could not save that step. Try again.",
        );
      } finally {
        inFlight.current.delete(step.key);
      }
    });
  };

  return (
    <ul className={cn("flex flex-col divide-y divide-border", className)}>
      {optimistic.map((step) => {
        const Icon = STEP_ICON[step.key];
        const label = FINISHING_STEP_LABELS[step.key];
        const done = step.completedAt !== null;
        return (
          <li key={step.key} className={sizing.row}>
            <button
              type="button"
              onClick={() => toggle(step)}
              aria-pressed={done}
              aria-label={`Mark "${label}" ${done ? "not done" : "done"}`}
              className={cn(sizing.hit, "rounded-md")}
            >
              <span
                className={cn(
                  "flex items-center justify-center border-2 transition-colors",
                  sizing.box,
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface",
                )}
              >
                {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </button>

            <Icon
              className={cn(
                sizing.icon,
                done ? "text-muted-foreground/60" : STEP_ICON_TONE[step.key],
              )}
              aria-hidden
            />

            <span
              className={cn(
                sizing.label,
                done && "text-muted-foreground line-through",
              )}
            >
              {label}
            </span>

            {/* Completion date, or an em dash so the column still reads as a
                column on the rows that have nothing to show. */}
            <span
              className={cn(
                sizing.date,
                done ? "text-muted-foreground" : "text-muted-foreground/50",
              )}
            >
              {step.completedAt
                ? format(new Date(step.completedAt), "MMM d")
                : "—"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
