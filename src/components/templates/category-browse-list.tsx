"use client";

import { ChevronRight } from "lucide-react";
import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CATEGORY_ORDER,
  type TemplateCategory,
} from "@/lib/data/templates";
import { CategoryIcon } from "./category-icon";

export function CategoryBrowseList({
  counts,
  onSelect,
}: {
  counts: Record<TemplateCategory, number>;
  onSelect: (category: TemplateCategory) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {TEMPLATE_CATEGORY_ORDER.map((category) => {
        const count = counts[category] ?? 0;
        return (
          <div
            key={category}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(category)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(category);
              }
            }}
            className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left shadow-sm transition-colors hover:bg-surface-2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CategoryIcon category={category} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {TEMPLATE_CATEGORY_LABELS[category]}
              </p>
              <p className="text-xs text-muted-foreground">
                {count} {count === 1 ? "template" : "templates"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </div>
        );
      })}
    </div>
  );
}
