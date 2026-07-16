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
import type { LibraryItem } from "@/lib/data/library-items";
import { deleteLibraryItem } from "@/app/actions/instruments";

export function LibraryDeleteDialog({
  open,
  onOpenChange,
  item,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: LibraryItem | null;
  onDeleted: (id: string) => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) setError(null);
    onOpenChange(next);
  }

  async function handleDelete() {
    if (!item) return;
    setError(null);
    setSubmitting(true);
    try {
      await deleteLibraryItem(item.id);
      onDeleted(item.id);
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="pr-8">
            Delete “{item?.name}”?
          </DialogTitle>
          <DialogDescription>
            This removes the item and its notes from your library. This can’t
            be undone.
          </DialogDescription>
        </DialogHeader>

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
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
