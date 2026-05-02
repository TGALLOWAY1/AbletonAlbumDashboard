"use client";

import { LayoutGrid, List } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  TEMPLATE_TAB_LABELS,
  type TemplateCategory,
} from "@/lib/data/templates";

export type TemplateSort =
  | "name-asc"
  | "recently-modified"
  | "recently-created"
  | "category"
  | "most-used";

export type TemplateView = "grid" | "list";

const TABS: ("all" | TemplateCategory)[] = [
  "all",
  "sound-design",
  "arrangement",
  "mixing",
  "mastering",
  "genre",
  "workflow",
];

const SORT_OPTIONS: { value: TemplateSort; label: string }[] = [
  { value: "name-asc", label: "Sort: A–Z" },
  { value: "recently-modified", label: "Sort: Recently Modified" },
  { value: "recently-created", label: "Sort: Recently Created" },
  { value: "category", label: "Sort: Category" },
  { value: "most-used", label: "Sort: Most Used" },
];

export function TemplatesToolbar({
  tab,
  onTabChange,
  sort,
  onSortChange,
  view,
  onViewChange,
}: {
  tab: "all" | TemplateCategory;
  onTabChange: (value: "all" | TemplateCategory) => void;
  sort: TemplateSort;
  onSortChange: (value: TemplateSort) => void;
  view: TemplateView;
  onViewChange: (value: TemplateView) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="-mx-1 flex flex-1 items-center gap-1 overflow-x-auto px-1">
        {TABS.map((value) => {
          const active = tab === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onTabChange(value)}
              className={cn(
                "whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary/40 bg-primary/12 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {TEMPLATE_TAB_LABELS[value]}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="w-56">
          <Select
            value={sort}
            onValueChange={(v) => onSortChange(v as TemplateSort)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex h-9 items-center rounded-md border border-border bg-surface-2 p-0.5">
          <button
            type="button"
            aria-label="Grid view"
            onClick={() => onViewChange("grid")}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
              view === "grid"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="List view"
            onClick={() => onViewChange("list")}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
              view === "list"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
