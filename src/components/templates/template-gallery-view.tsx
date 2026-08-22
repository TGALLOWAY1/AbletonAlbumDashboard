"use client";

import { Badge } from "@/components/ui/badge";
import {
  TEMPLATE_CATEGORY_LABELS,
  type TemplateItem,
} from "@/lib/data/templates";
import type { TemplateValues } from "@/lib/template-value";
import { cn } from "@/lib/utils";
import { GALLERY_GRID_CLASSES, type ViewSize } from "@/lib/view-mode";
import type { TemplateAction } from "./types";
import { TemplateActionsMenu } from "./template-actions-menu";
import { TemplateThumbnail } from "./template-thumbnail";
import { TemplateValueBadge } from "./template-value-badge";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * Thumbnail-first layout at three densities:
 *  - large  — one template across, artwork beside the full description.
 *  - medium — card grid: artwork, name, description, usage.
 *  - small  — a wall of thumbnails with names underneath.
 *
 * `showCategory` drops the category pill when the grid is already scoped to
 * one category — the template keeps its `category`, only the label goes.
 */
export function TemplateGalleryView({
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
  return (
    <div className={cn("grid gap-3", GALLERY_GRID_CLASSES[size])}>
      {items.map((item) =>
        size === "large" ? (
          <LargeTile
            key={item.id}
            item={item}
            value={values[item.id]}
            showCategory={showCategory}
            onSelect={onSelect}
            onAction={onAction}
          />
        ) : size === "medium" ? (
          <MediumTile
            key={item.id}
            item={item}
            value={values[item.id]}
            showCategory={showCategory}
            onSelect={onSelect}
            onAction={onAction}
          />
        ) : (
          <SnapshotTile key={item.id} item={item} onSelect={onSelect} />
        ),
      )}
    </div>
  );
}

function LargeTile({
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
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-surface text-left shadow-sm transition-colors hover:bg-surface-2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row"
    >
      <TemplateThumbnail
        seed={item.id}
        className="w-full shrink-0 rounded-none sm:w-72"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-xl font-semibold text-foreground">
                {item.name}
              </h3>
              {showCategory && (
                <Badge variant="primary">
                  {TEMPLATE_CATEGORY_LABELS[item.category]}
                </Badge>
              )}
              <TemplateValueBadge value={value} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.description}
            </p>
          </div>
          <TemplateActionsMenu item={item} onAction={onAction} />
        </div>
        <p className="mt-auto pt-2 text-xs text-muted-foreground">
          Used {item.useCount} {item.useCount === 1 ? "time" : "times"} ·
          Updated {DATE_FORMATTER.format(new Date(item.updatedAt))}
        </p>
      </div>
    </div>
  );
}

function MediumTile({
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
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-surface text-left shadow-sm transition-colors hover:bg-surface-2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <TemplateThumbnail seed={item.id} className="rounded-none" />
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-1">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {item.name}
          </h3>
          <TemplateActionsMenu
            item={item}
            onAction={onAction}
            className="-mr-1 -mt-1 h-7 w-7"
          />
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {item.description}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {showCategory ? (
            <Badge variant="primary">
              {TEMPLATE_CATEGORY_LABELS[item.category]}
            </Badge>
          ) : (
            <span />
          )}
          <div className="flex shrink-0 items-center gap-1.5">
            <TemplateValueBadge value={value} />
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {item.useCount}×
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Whole tile is a single button — no nested actions menu at this density.
function SnapshotTile({
  item,
  onSelect,
}: {
  item: TemplateItem;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      title={`${item.name} — ${item.description}`}
      className="group flex cursor-pointer flex-col gap-1.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <TemplateThumbnail
        seed={item.id}
        showPlay={false}
        className="border border-border transition-colors group-hover:border-primary/50"
      />
      <span className="w-full truncate text-xs font-medium leading-tight text-foreground">
        {item.name}
      </span>
    </button>
  );
}
