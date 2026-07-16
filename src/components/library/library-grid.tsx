"use client";

import { MoreHorizontal, NotebookPen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  categoryBadgeVariant,
  categoryLabel,
  type LibraryItem,
} from "@/lib/data/library-items";

export function LibraryGrid({
  items,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onNotes,
}: {
  items: LibraryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (item: LibraryItem) => void;
  onDelete: (item: LibraryItem) => void;
  onNotes: (item: LibraryItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-sm text-muted-foreground">
        No items match your filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(item.id);
              }
            }}
            className={cn(
              "flex cursor-pointer flex-col gap-3 rounded-lg border border-border bg-surface p-4 text-left shadow-sm transition-colors hover:bg-surface-2/40",
              selected && "border-primary/40 bg-primary/5",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{item.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {item.source}
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Actions"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onEdit(item)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onDelete(item)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Badge variant={categoryBadgeVariant(item.category)}>
                {categoryLabel(item.category)}
              </Badge>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNotes(item);
                }}
                className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
              >
                <NotebookPen className="h-3.5 w-3.5" />
                {item.notes ? "Notes" : "Add notes"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
