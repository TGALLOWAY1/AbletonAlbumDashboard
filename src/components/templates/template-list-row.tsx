"use client";

import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TEMPLATE_CATEGORY_LABELS,
  type TemplateItem,
} from "@/lib/data/templates";
import type { TemplateAction } from "./types";
import { CategoryIcon } from "./category-icon";

export function TemplateListRow({
  item,
  onSelect,
  onAction,
}: {
  item: TemplateItem;
  onSelect: (id: string) => void;
  onAction: (action: TemplateAction, item: TemplateItem) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item.id);
        }
      }}
      className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left shadow-sm transition-colors hover:bg-surface-2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CategoryIcon category={item.category} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {item.name}
          </h3>
          <Badge variant="primary">
            {TEMPLATE_CATEGORY_LABELS[item.category]}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {item.description}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={(e) => e.stopPropagation()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
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
    </div>
  );
}
