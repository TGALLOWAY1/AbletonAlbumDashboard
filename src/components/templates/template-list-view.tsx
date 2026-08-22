"use client";

import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  TEMPLATE_CATEGORY_LABELS,
  type TemplateItem,
} from "@/lib/data/templates";
import type { TemplateValues } from "@/lib/template-value";
import type { ViewSize } from "@/lib/view-mode";
import type { TemplateAction } from "./types";
import { CategoryIcon } from "./category-icon";
import { TemplateActionsMenu } from "./template-actions-menu";
import { TemplateListRow } from "./template-list-row";
import { TemplateThumbnail } from "./template-thumbnail";
import { TemplateValueBadge } from "./template-value-badge";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * Row-per-template layout at three densities:
 *  - large  — thumbnail beside name, description, and usage meta.
 *  - medium — the classic icon row (`TemplateListRow`).
 *  - small  — a scannable index: icon, name, use count, chevron.
 *
 * `showCategory` drops the category pill when the list is already scoped to
 * one category — the template keeps its `category`, only the label goes.
 */
export function TemplateListView({
  items,
  values = {},
  size,
  showCategory = true,
  onSelect,
  onAction,
}: {
  items: TemplateItem[];
  /** The producer's 1–5 ratings, keyed by template id. */
  values?: TemplateValues;
  size: ViewSize;
  showCategory?: boolean;
  onSelect: (id: string) => void;
  onAction: (action: TemplateAction, item: TemplateItem) => void;
}) {
  if (size === "large") {
    return (
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <LargeRow
            key={item.id}
            item={item}
            value={values[item.id]}
            showCategory={showCategory}
            onSelect={onSelect}
            onAction={onAction}
          />
        ))}
      </div>
    );
  }

  if (size === "medium") {
    return (
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <TemplateListRow
            key={item.id}
            item={item}
            value={values[item.id]}
            showCategory={showCategory}
            onSelect={onSelect}
            onAction={onAction}
          />
        ))}
      </div>
    );
  }

  return (
    <Card className="divide-y divide-border overflow-hidden">
      {items.map((item) => (
        <CompactRow
          key={item.id}
          item={item}
          value={values[item.id]}
          showCategory={showCategory}
          onSelect={onSelect}
        />
      ))}
    </Card>
  );
}

function LargeRow({
  item,
  value,
  showCategory,
  onSelect,
  onAction,
}: {
  item: TemplateItem;
  value: number | undefined;
  showCategory: boolean;
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
      className="group flex cursor-pointer flex-col gap-3 rounded-lg border border-border bg-surface p-3 text-left shadow-sm transition-colors hover:bg-surface-2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:gap-4"
    >
      <TemplateThumbnail
        seed={item.id}
        showPlay={false}
        className="w-full shrink-0 sm:w-48"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-semibold text-foreground">
            {item.name}
          </h3>
          {showCategory && (
            <Badge variant="primary">
              {TEMPLATE_CATEGORY_LABELS[item.category]}
            </Badge>
          )}
          <TemplateValueBadge value={value} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Used {item.useCount} {item.useCount === 1 ? "time" : "times"} ·
          Updated {DATE_FORMATTER.format(new Date(item.updatedAt))}
        </p>
      </div>
      <TemplateActionsMenu
        item={item}
        onAction={onAction}
        className="self-end sm:self-center"
      />
    </div>
  );
}

// Whole row is a single button — no nested interactive elements at this
// density, matching the tracks compact list.
function CompactRow({
  item,
  value,
  showCategory,
  onSelect,
}: {
  item: TemplateItem;
  value: number | undefined;
  showCategory: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <CategoryIcon
        category={item.category}
        size="sm"
        className="h-7 w-7 rounded-md [&>svg]:h-4 [&>svg]:w-4"
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {item.name}
      </span>
      {showCategory && (
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {TEMPLATE_CATEGORY_LABELS[item.category]}
        </span>
      )}
      <TemplateValueBadge value={value} />
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {item.useCount}×
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
