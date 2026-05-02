"use client";

import {
  TEMPLATE_CATEGORY_LABELS,
  type TemplateCategory,
  type TemplateItem,
} from "@/lib/data/templates";
import type { TemplateAction } from "./types";
import { TemplateCard } from "./template-card";
import { TemplateListRow } from "./template-list-row";

export function TemplateSection({
  category,
  items,
  view,
  selectedId,
  showHeader = true,
  onSelect,
  onAction,
}: {
  category: TemplateCategory;
  items: TemplateItem[];
  view: "grid" | "list";
  selectedId: string | null;
  showHeader?: boolean;
  onSelect: (id: string) => void;
  onAction: (action: TemplateAction, item: TemplateItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      {showHeader && (
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {TEMPLATE_CATEGORY_LABELS[category]}
        </h2>
      )}
      {view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => (
            <TemplateCard
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={onSelect}
              onAction={onAction}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <TemplateListRow
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={onSelect}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </section>
  );
}
