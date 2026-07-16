"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { LibraryItem } from "@/lib/data/library-items";
import { updateLibraryItem } from "@/app/actions/instruments";

export function LibraryNotesDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: LibraryItem | null;
  onSaved: (item: LibraryItem) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {item && (
          <NotesForm
            key={item.id}
            item={item}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NotesForm({
  item,
  onSaved,
  onClose,
}: {
  item: LibraryItem;
  onSaved: (item: LibraryItem) => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = React.useState(item.notes);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("name", item.name);
      formData.set("category", item.category);
      formData.set("source", item.source);
      formData.set("notes", notes.trim());

      const saved = await updateLibraryItem(item.id, formData);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="pr-8">Notes — {item.name}</DialogTitle>
        <DialogDescription>
          Macro mappings, chain notes, where it lives…
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="No notes yet — write some."
          aria-label="Notes"
          autoFocus
        />

        {error && (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save notes"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
