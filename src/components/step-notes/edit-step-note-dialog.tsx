"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateStepNote } from "@/app/actions/step-notes";
import { MAX_STEP_NOTE_TITLE, type StepNote } from "@/lib/step-notes";

/**
 * Edit a saved note: its title and, for a markdown note, its body. An image
 * note's body is its file, so only the title is editable there — replacing
 * the image is a delete and a new upload, the same rule as a resource's PDF.
 */
export function EditStepNoteDialog({ note }: { note: StepNote }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(note.title);
  const [content, setContent] = React.useState(note.content ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Reopening after a cancel must show the saved note again, not the
  // abandoned edit.
  function reset() {
    setTitle(note.title);
    setContent(note.content ?? "");
    setError(null);
    setSubmitting(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await updateStepNote({
        noteId: note.id,
        trackId: note.trackId,
        title,
        ...(note.kind === "markdown" ? { content } : {}),
      });
      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      router.refresh();
      setOpen(false);
      setSubmitting(false);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit note</DialogTitle>
          <DialogDescription>
            {note.kind === "image"
              ? "Change the title. The image stays as it is — delete the note and add another to replace it."
              : "Change the title and the markdown."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`edit-note-title-${note.id}`}>Title (optional)</Label>
            <Input
              id={`edit-note-title-${note.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={MAX_STEP_NOTE_TITLE}
            />
          </div>

          {note.kind === "markdown" && (
            <div className="grid gap-2">
              <Label htmlFor={`edit-note-content-${note.id}`}>
                Markdown content
              </Label>
              <Textarea
                id={`edit-note-content-${note.id}`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          )}

          {error && (
            <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                (note.kind === "markdown" && content.trim().length === 0)
              }
            >
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
