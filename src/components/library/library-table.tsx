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

function NotesLink({
  item,
  onNotes,
  className,
}: {
  item: LibraryItem;
  onNotes: (item: LibraryItem) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onNotes(item);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline",
        className,
      )}
    >
      <NotebookPen className="h-3.5 w-3.5" />
      {item.notes ? "Notes" : "Add notes"}
    </button>
  );
}

function RowActions({
  item,
  onEdit,
  onDelete,
  buttonClassName,
}: {
  item: LibraryItem;
  onEdit: (item: LibraryItem) => void;
  onDelete: (item: LibraryItem) => void;
  buttonClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Actions"
          className={cn(
            "flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground",
            buttonClassName,
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit(item)}>Edit</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDelete(item)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LibraryTable({
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
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      {/* Mobile card list (<md) */}
      <ul className="flex flex-col md:hidden">
        {items.map((item) => {
          const selected = item.id === selectedId;
          return (
            <li
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex cursor-pointer flex-col gap-2 border-b border-border p-3 transition-colors last:border-b-0 hover:bg-surface-2/60",
                selected && "bg-primary/5",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {item.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.source}
                  </span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <RowActions
                    item={item}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    buttonClassName="h-10 w-10"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={categoryBadgeVariant(item.category)}>
                  {categoryLabel(item.category)}
                </Badge>
                <NotesLink item={item} onNotes={onNotes} />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop grid table (md+) */}
      <div className="hidden grid-cols-[minmax(200px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_44px] items-center gap-3 border-b border-border bg-surface-2/60 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
        <div>Name</div>
        <div>Category</div>
        <div>Source</div>
        <div>Notes</div>
        <div />
      </div>

      <ul className="hidden flex-col md:flex">
        {items.map((item) => {
          const selected = item.id === selectedId;
          return (
            <li
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "grid cursor-pointer grid-cols-[minmax(200px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_44px] items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-2/60",
                selected && "bg-primary/5",
              )}
            >
              <div className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">
                  {item.name}
                </span>
              </div>

              <div>
                <Badge variant={categoryBadgeVariant(item.category)}>
                  {categoryLabel(item.category)}
                </Badge>
              </div>

              <div className="truncate text-sm text-muted-foreground">
                {item.source}
              </div>

              <div>
                <NotesLink item={item} onNotes={onNotes} />
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                <RowActions
                  item={item}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  buttonClassName="h-8 w-8"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
