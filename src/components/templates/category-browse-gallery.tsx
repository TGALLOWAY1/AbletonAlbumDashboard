"use client";

import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CATEGORY_ORDER,
  type TemplateCategory,
} from "@/lib/data/templates";
import { CategoryIcon } from "./category-icon";

/**
 * Category browser as a 3×3 tile grid — one row each for building sounds
 * (workflow / sound design / genre), finishing records (arrangement / mixing /
 * mastering), and playing out (rehearsal / performance / DJ). The row grouping
 * comes from `TEMPLATE_CATEGORY_ORDER`, so the grid stays three columns at
 * every breakpoint rather than reflowing.
 */
export function CategoryBrowseGallery({
  counts,
  onSelect,
}: {
  counts: Record<TemplateCategory, number>;
  onSelect: (category: TemplateCategory) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {TEMPLATE_CATEGORY_ORDER.map((category) => {
        const count = counts[category] ?? 0;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            className="group flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-border bg-surface p-3 text-center shadow-sm transition-colors hover:bg-surface-2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
          >
            <CategoryIcon category={category} size="md" />
            <span className="w-full">
              <span className="block truncate text-xs font-semibold text-foreground sm:text-sm">
                {TEMPLATE_CATEGORY_LABELS[category]}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground sm:text-xs">
                {count} {count === 1 ? "template" : "templates"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
