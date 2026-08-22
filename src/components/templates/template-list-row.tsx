"use client";

import { Badge } from "@/components/ui/badge";
import {
  TEMPLATE_CATEGORY_LABELS,
  type TemplateItem,
} from "@/lib/data/templates";
import type { TemplateAction } from "./types";
import { CategoryIcon } from "./category-icon";
import { TemplateActionsMenu } from "./template-actions-menu";

export function TemplateListRow({
  item,
  onSelect,
  onAction,
  showCategory = true,
}: {
  item: TemplateItem;
  onSelect: (id: string) => void;
  onAction: (action: TemplateAction, item: TemplateItem) => void;
  /**
   * Hide the category badge when the surrounding list is already scoped to
   * that category — the pill would just repeat the heading. The template's
   * `category` field is untouched; only the label is dropped.
   */
  showCategory?: boolean;
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
          {showCategory && (
            <Badge variant="primary">
              {TEMPLATE_CATEGORY_LABELS[item.category]}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {item.description}
        </p>
      </div>
      <TemplateActionsMenu item={item} onAction={onAction} />
    </div>
  );
}
