"use client";

import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { TemplateItem } from "@/lib/data/templates";
import type { TemplateAction } from "./types";

/** The ··· menu shared by every list row and gallery tile density. */
export function TemplateActionsMenu({
  item,
  onAction,
  className,
}: {
  item: TemplateItem;
  onAction: (action: TemplateAction, item: TemplateItem) => void;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground",
          className,
        )}
        aria-label="Template actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => onAction("open-template", item)}>
          Open Template
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("open-in-finder", item)}>
          Open in Finder
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("duplicate", item)}>
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("edit-notes", item)}>
          Edit Notes
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onAction("archive", item)}>
          Archive
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => onAction("delete", item)}
          className="text-danger focus:text-danger"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
