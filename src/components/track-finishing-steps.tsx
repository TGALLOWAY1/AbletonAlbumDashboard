"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  AudioWaveform,
  Check,
  Download,
  MessageCircleMore,
  Palette,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  addTrackVariation,
  deleteTrackVariation,
  setFinishingStep,
  setVariationStep,
} from "@/app/actions/finishing-steps";
import { useToast } from "@/components/toast";
import {
  FINISHING_STEP_LABELS,
  type FinishingStep,
  type FinishingStepKey,
  type TrackVariation,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The hand-off checklist drawn straight on a track card — one row per
 * FINISHING_STEP_KEYS entry, first for the track itself, then once more for
 * each named variation (migration 0031), so a song with several variations in
 * flight can walk every one through the same workflow. Adding and deleting
 * variations happens right here for the same reason ticking does: the card is
 * a working surface, not a read-out.
 *
 * `variant` controls sizing only (CLAUDE.md's shared-component rule): `card`
 * is the 44px-tap-target treatment for the large mobile card, `compact` the
 * denser one for desktop widths.
 */

const STEP_ICON: Record<FinishingStepKey, LucideIcon> = {
  suno_variations: Sparkles,
  arrangement_favorites: Star,
  sound_palette: Palette,
  core_elements: AudioWaveform,
  mixing_tips: MessageCircleMore,
  stems_midi: Download,
  ableton_cleanup: SlidersHorizontal,
};

// Restrained: steps that produce something get an accent, the tidy-up stays
// neutral. The two accents alternate through the Suno workflow so a seven-row
// list still reads as rows, not a rainbow. Icons carry the colour so the
// labels can all read as plain text.
const STEP_ICON_TONE: Record<FinishingStepKey, string> = {
  suno_variations: "text-primary",
  arrangement_favorites: "text-accent",
  sound_palette: "text-primary",
  core_elements: "text-accent",
  mixing_tips: "text-primary",
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

type ChecklistState = {
  steps: FinishingStep[];
  variations: TrackVariation[];
};

type ChecklistEvent =
  | { type: "step"; step: FinishingStep }
  | { type: "variation-step"; variationId: string; step: FinishingStep }
  | { type: "remove-variation"; variationId: string };

function applyEvent(
  state: ChecklistState,
  event: ChecklistEvent,
): ChecklistState {
  switch (event.type) {
    case "step":
      return {
        ...state,
        steps: state.steps.map((s) =>
          s.key === event.step.key ? event.step : s,
        ),
      };
    case "variation-step":
      return {
        ...state,
        variations: state.variations.map((v) =>
          v.id === event.variationId
            ? {
                ...v,
                steps: v.steps.map((s) =>
                  s.key === event.step.key ? event.step : s,
                ),
              }
            : v,
        ),
      };
    case "remove-variation":
      return {
        ...state,
        variations: state.variations.filter((v) => v.id !== event.variationId),
      };
  }
}

export function TrackFinishingSteps({
  trackId,
  steps,
  variations = [],
  variant = "card",
  className,
}: {
  trackId: string;
  /** Always every FINISHING_STEP_KEYS entry, in order — see `finishingStepsFromRows`. */
  steps: FinishingStep[];
  /** Named variations in creation order, each with its own checklist run. */
  variations?: TrackVariation[];
  variant?: Variant;
  className?: string;
}) {
  const sizing = SIZING[variant];
  const [optimistic, applyOptimistic] = useOptimistic(
    { steps, variations },
    applyEvent,
  );
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savePending, startSaveTransition] = useTransition();
  // One write in flight per row. Each write sends an absolute state, not a
  // flip, so two taps in quick succession would race: nothing orders the two
  // requests, and the first can settle last and leave the row saved opposite
  // to what the card shows. A ref rather than state because the guard has to
  // hold within a single tick, before React has re-rendered. Keys are scoped
  // per variation so the same step on two checklists never blocks itself.
  const inFlight = useRef<Set<string>>(new Set());

  const toggle = (step: FinishingStep, variationId: string | null) => {
    const flightKey = `${variationId ?? "track"}:${step.key}`;
    if (inFlight.current.has(flightKey)) return;
    inFlight.current.add(flightKey);
    const complete = step.completedAt === null;
    startTransition(async () => {
      const next: FinishingStep = {
        key: step.key,
        completedAt: complete ? new Date().toISOString() : null,
      };
      applyOptimistic(
        variationId
          ? { type: "variation-step", variationId, step: next }
          : { type: "step", step: next },
      );
      try {
        const result = variationId
          ? await setVariationStep(trackId, variationId, step.key, complete)
          : await setFinishingStep(trackId, step.key, complete);
        if (result?.error) toast(result.error);
      } catch (e) {
        // The actions return their own failures, so reaching here means the
        // request never got an answer — a dropped connection, or a throw
        // before the action's error handling. Without this the transition
        // rejects unhandled and the tick silently rolls back with no toast.
        toast(
          e instanceof Error && e.message
            ? e.message
            : "Could not save that step. Try again.",
        );
      } finally {
        inFlight.current.delete(flightKey);
      }
    });
  };

  const removeVariation = (variation: TrackVariation) => {
    if (
      !confirm(
        `Delete variation "${variation.name}"? Its checklist goes with it.`,
      )
    )
      return;
    startTransition(async () => {
      applyOptimistic({ type: "remove-variation", variationId: variation.id });
      try {
        const result = await deleteTrackVariation(trackId, variation.id);
        if (result?.error) toast(result.error);
      } catch {
        toast("Could not delete that variation. Try again.");
      }
    });
  };

  const submitVariation = () => {
    const name = draftName.trim();
    if (!name || savePending) return;
    startSaveTransition(async () => {
      try {
        const result = await addTrackVariation(trackId, name);
        if (result?.error) {
          toast(result.error);
          return;
        }
        // The revalidated track props carry the new variation in; the form
        // just resets.
        setDraftName("");
        setAdding(false);
      } catch {
        toast("Could not add that variation. Try again.");
      }
    });
  };

  const stepRow = (step: FinishingStep, variationId: string | null) => {
    const Icon = STEP_ICON[step.key];
    const label = FINISHING_STEP_LABELS[step.key];
    const done = step.completedAt !== null;
    return (
      <li key={step.key} className={sizing.row}>
        <button
          type="button"
          onClick={() => toggle(step, variationId)}
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
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <ul className="flex flex-col divide-y divide-border">
        {optimistic.steps.map((step) => stepRow(step, null))}
      </ul>

      {optimistic.variations.map((variation) => (
        <section
          key={variation.id}
          aria-label={`Variation "${variation.name}"`}
          className="border-t border-border pt-1"
        >
          <div className="flex min-h-[34px] items-center justify-between gap-2">
            <h4 className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {variation.name}
            </h4>
            <button
              type="button"
              onClick={() => removeVariation(variation)}
              aria-label={`Delete variation "${variation.name}"`}
              className="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {variation.steps.map((step) => stepRow(step, variation.id))}
          </ul>
        </section>
      ))}

      <div className="border-t border-border">
        {adding ? (
          <form
            className="flex items-center gap-2 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              submitVariation();
            }}
          >
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDraftName("");
                  setAdding(false);
                }
              }}
              maxLength={80}
              placeholder="Variation name"
              aria-label="Variation name"
              className="h-8 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={savePending || draftName.trim().length === 0}
              className="h-8 shrink-0 rounded-md border border-border px-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              Add
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={cn(
              "flex w-full items-center gap-2 text-muted-foreground transition-colors hover:text-foreground",
              variant === "card"
                ? "min-h-[44px] text-[15px]"
                : "min-h-[34px] text-sm",
            )}
          >
            <Plus className={sizing.icon} aria-hidden />
            Add variation
          </button>
        )}
      </div>
    </div>
  );
}
