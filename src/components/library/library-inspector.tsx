"use client";

import { NotebookPen, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  categoryLabel,
  type LibraryItem,
} from "@/lib/data/library-items";

export function LibraryInspector({
  item,
  onEdit,
  onDelete,
  onNotes,
}: {
  item: LibraryItem | null;
  onEdit: (item: LibraryItem) => void;
  onDelete: (item: LibraryItem) => void;
  onNotes: (item: LibraryItem) => void;
}) {
  if (!item) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 text-sm text-muted-foreground shadow-sm">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Details
        </h3>
        <p>Select an item from the table to see its details and notes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Details
      </h3>

      <div className="truncate text-sm font-semibold text-foreground">
        {item.name}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Meta label="Category" value={categoryLabel(item.category)} />
        <Meta label="Source" value={item.source} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Notes
          </div>
          <button
            type="button"
            onClick={() => onNotes(item)}
            className="inline-flex items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline"
          >
            <NotebookPen className="h-3 w-3" />
            {item.notes ? "Edit notes" : "Add notes"}
          </button>
        </div>
        {item.notes ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {item.notes}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(item)}
          className="text-danger hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
