import { notFound } from "next/navigation";
import { format } from "date-fns";
import { BackLink } from "@/components/back-link";
import { STEP_ICON, STEP_ICON_TONE } from "@/components/finishing-step-icons";
import { StepNotesPanel } from "@/components/step-notes/step-notes-panel";
import { getStepNotes } from "@/lib/data/step-notes";
import { getTrack } from "@/lib/data/tracks";
import { isFinishingStepKey } from "@/lib/step-notes";
import { trackPaneHref } from "@/lib/track-pane";
import { FINISHING_STEP_LABELS } from "@/lib/types";
import { isMobileUserAgent } from "@/lib/user-agent";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * The notes behind one finishing-step row.
 *
 * Reached from the chevron on that row, on every surface that draws the
 * checklist. Like `/tracks/[id]/edit`, one route serves both track surfaces:
 * this is a single column of notes with nothing for a phone to arrange
 * differently, so an `/m/` twin would only be a second copy to keep in step.
 * Only the way back differs, and that is decided here from the user agent so
 * the phone returns to its tabbed workspace rather than through a redirect.
 *
 * `?variation=<id>` opens the same step on one of the track's variations
 * (migration 0031), whose checklist run has its own notes.
 */
export default async function StepNotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; stepKey: string }>;
  searchParams: Promise<{ variation?: string | string[] }>;
}) {
  const [{ id, stepKey }, { variation }] = await Promise.all([
    params,
    searchParams,
  ]);
  if (!isFinishingStepKey(stepKey)) notFound();
  const variationParam =
    (Array.isArray(variation) ? variation[0] : variation)?.trim() || null;

  const [track, notes, mobile] = await Promise.all([
    getTrack(id),
    getStepNotes(id, stepKey, variationParam),
    isMobileUserAgent(),
  ]);
  if (!track) notFound();

  const variationRow = variationParam
    ? (track.variations.find((v) => v.id === variationParam) ?? null)
    : null;
  if (variationParam && !variationRow) notFound();

  const checklist = variationRow ? variationRow.steps : track.finishingSteps;
  const step = checklist.find((s) => s.key === stepKey);
  const label = FINISHING_STEP_LABELS[stepKey];
  const Icon = STEP_ICON[stepKey];
  const backHref = mobile ? trackPaneHref(track.id, "tasks") : `/tracks/${track.id}#tasks`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div>
        <BackLink fallback={backHref} label={track.name} className="-ml-2" />
      </div>

      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Finishing
          {variationRow && (
            <>
              {" · "}
              <span className="normal-case tracking-normal">
                {variationRow.name}
              </span>
            </>
          )}
        </p>
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <Icon
            className={cn("h-6 w-6 shrink-0", STEP_ICON_TONE[stepKey])}
            aria-hidden
          />
          <span>{label}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {step?.completedAt
            ? `Done ${format(new Date(step.completedAt), "MMM d, yyyy")}`
            : "Not done yet"}
        </p>
      </header>

      <StepNotesPanel
        trackId={track.id}
        stepKey={stepKey}
        variationId={variationRow?.id ?? null}
        stepLabel={label}
        notes={notes}
      />
    </div>
  );
}
