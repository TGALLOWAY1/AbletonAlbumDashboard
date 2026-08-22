"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CATEGORY_ORDER,
  type TemplateCategory,
  type TemplateItem,
} from "@/lib/data/templates";
import {
  compareTemplates,
  DEFAULT_TEMPLATE_SORT,
  type TemplateSort,
} from "@/lib/template-sort";
import { useTemplateValues } from "@/lib/template-value";
import { CategoryBrowseList } from "./category-browse-list";
import { TemplateListRow } from "./template-list-row";
import { TemplateSortControl } from "./template-sort-control";
import type { TemplateAction } from "./types";

const DESKTOP_TOAST = "Desktop integration required to open local files.";

function TemplatesPageInner({ items: initialItems }: { items: TemplateItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = React.useState<TemplateItem[]>(initialItems);
  const { values } = useTemplateValues();
  const [sort, setSort] = React.useState<TemplateSort>(DEFAULT_TEMPLATE_SORT);
  const [view, setView] = React.useState<"home" | "category">("home");
  const [activeCategory, setActiveCategory] = React.useState<
    "all" | TemplateCategory
  >("all");

  const counts = React.useMemo(() => {
    const map = Object.fromEntries(
      TEMPLATE_CATEGORY_ORDER.map((c) => [c, 0]),
    ) as Record<TemplateCategory, number>;
    for (const item of items) map[item.category] += 1;
    return map;
  }, [items]);

  const categoryItems = React.useMemo(() => {
    const filtered =
      activeCategory === "all"
        ? items
        : items.filter((i) => i.category === activeCategory);
    return [...filtered].sort((a, b) => compareTemplates(a, b, sort, values));
  }, [items, activeCategory, sort, values]);

  const openCategory = (category: "all" | TemplateCategory) => {
    setActiveCategory(category);
    setView("category");
  };

  const handleSelect = (id: string) => {
    router.push(`/templates/${id}`);
  };

  const handleAction = (action: TemplateAction, item?: TemplateItem) => {
    switch (action) {
      case "open-template":
      case "open-in-finder":
      case "reveal-template":
        toast(DESKTOP_TOAST);
        return;
      case "new-template":
        toast("New template flow coming soon");
        return;
      case "import-template":
        toast("Import template flow coming soon");
        return;
      case "duplicate": {
        if (!item) return;
        const now = new Date().toISOString();
        const copy: TemplateItem = {
          ...item,
          id: `${item.id}-copy-${Date.now()}`,
          name: `${item.name} (Copy)`,
          useCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        setItems((prev) => [...prev, copy]);
        toast(`Duplicated "${item.name}"`);
        return;
      }
      case "edit-notes":
        if (!item) return;
        router.push(`/templates/${item.id}`);
        return;
      case "archive":
        if (!item) return;
        toast(`Archived "${item.name}"`);
        return;
      case "delete":
        if (!item) return;
        setItems((prev) => prev.filter((t) => t.id !== item.id));
        toast(`Deleted "${item.name}"`);
        return;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Templates</h1>
          <p className="mt-1 text-muted-foreground">
            Production templates to speed up your workflow and spark new ideas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => handleAction("new-template")}>
            <Plus className="h-4 w-4" />
            New Template
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAction("import-template")}
          >
            <Upload className="h-4 w-4" />
            Import Template
          </Button>
        </div>
      </header>

      {view === "home" ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Browse by Category
            </h2>
            <button
              type="button"
              onClick={() => openCategory("all")}
              className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              View all
            </button>
          </div>
          <CategoryBrowseList counts={counts} onSelect={openCategory} />
        </section>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Back to categories"
                onClick={() => setView("home")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {activeCategory === "all"
                    ? "All Templates"
                    : TEMPLATE_CATEGORY_LABELS[activeCategory]}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {categoryItems.length}{" "}
                  {categoryItems.length === 1 ? "template" : "templates"}
                </p>
              </div>
            </div>
            <TemplateSortControl sort={sort} onSortChange={setSort} />
          </div>

          {categoryItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-sm text-muted-foreground">
              No templates in this category yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {categoryItems.map((item) => (
                <TemplateListRow
                  key={item.id}
                  item={item}
                  value={values[item.id]}
                  onSelect={handleSelect}
                  onAction={handleAction}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TemplatesPageClient({ items }: { items: TemplateItem[] }) {
  return <TemplatesPageInner items={items} />;
}
