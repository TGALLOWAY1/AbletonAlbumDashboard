"use client";

import { useOptimistic, useTransition } from "react";
import { format } from "date-fns";
import { FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownBody } from "@/components/markdown-body";
import { useToast } from "@/components/toast";
import { deleteStepNote } from "@/app/actions/step-notes";
import type { StepNote } from "@/lib/step-notes";
import type { FinishingStepKey } from "@/lib/types";
import { AddStepNoteDialog } from "./add-step-note-dialog";
import { EditStepNoteDialog } from "./edit-step-note-dialog";
import { StepNoteImage } from "./step-note-image";

/**
 * The notes on one finishing step: the add control, then every note newest
 * first, each with its own edit and delete. The one client island on the
 * notes page — the header above it renders on the server.
 */
export function StepNotesPanel({
  trackId,
  stepKey,
  variationId,
  stepLabel,
  notes,
}: {
  trackId: string;
  stepKey: FinishingStepKey;
  variationId: string | null;
  stepLabel: string;
  notes: StepNote[];
}) {
  const [optimistic, removeOptimistic] = useOptimistic(
    notes,
    (state, removedId: string) => state.filter((n) => n.id !== removedId),
  );
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const remove = (note: StepNote) => {
    if (!confirm("Delete this note? This can't be undone.")) return;
    startTransition(async () => {
      removeOptimistic(note.id);
      try {
        const result = await deleteStepNote(note.id, trackId);
        if (result?.error) toast(result.error);
      } catch {
        toast("Could not delete that note. Try again.");
      }
    });
  };

  return (
    <section aria-label="Notes" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Notes
          {optimistic.length > 0 && (
            <span className="ml-1.5 tabular-nums">{optimistic.length}</span>
          )}
        </h2>
        <AddStepNoteDialog
          trackId={trackId}
          stepKey={stepKey}
          variationId={variationId}
          stepLabel={stepLabel}
        />
      </div>

      {optimistic.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing here yet. Add a markdown note or upload an image for this step.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {optimistic.map((note) => (
            <li
              key={note.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {note.kind === "image" ? (
                    <ImageIcon
                      className="h-4 w-4 shrink-0 text-accent"
                      aria-hidden
                    />
                  ) : (
                    <FileText
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      {note.title ||
                        (note.kind === "image" ? "Image" : "Note")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(note.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <EditStepNoteDialog note={note} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(note)}
                    aria-label="Delete note"
                    className="text-danger hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {note.kind === "image" ? (
                <StepNoteImage note={note} />
              ) : (
                <MarkdownBody className="rounded-md bg-surface-2 px-4 py-2">
                  {note.content ?? ""}
                </MarkdownBody>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
