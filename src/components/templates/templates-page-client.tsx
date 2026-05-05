"use client";

import * as React from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToastProvider, useToast } from "@/components/library/toast";
import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CATEGORY_ORDER,
  type AudioPreview,
  type TemplateCategory,
  type TemplateItem,
} from "@/lib/data/templates";
import { TemplateDetailPanel } from "./template-detail-panel";
import { TemplateSection } from "./template-section";
import {
  TemplatesToolbar,
  type TemplateSort,
  type TemplateView,
} from "./templates-toolbar";
import type { TemplateAction } from "./types";

const DESKTOP_TOAST = "Desktop integration required to open local files.";

function compareTemplates(
  a: TemplateItem,
  b: TemplateItem,
  sort: TemplateSort,
): number {
  switch (sort) {
    case "recently-modified":
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    case "recently-created":
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    case "category": {
      const ai = TEMPLATE_CATEGORY_ORDER.indexOf(a.category);
      const bi = TEMPLATE_CATEGORY_ORDER.indexOf(b.category);
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    }
    case "most-used":
      if (b.useCount !== a.useCount) return b.useCount - a.useCount;
      return a.name.localeCompare(b.name);
  }
}

function TemplatesPageInner({ items: initialItems }: { items: TemplateItem[] }) {
  const { toast } = useToast();
  const [items, setItems] = React.useState<TemplateItem[]>(initialItems);
  const [tab, setTab] = React.useState<"all" | TemplateCategory>("all");
  const [sort, setSort] = React.useState<TemplateSort>("recently-modified");
  const [view, setView] = React.useState<TemplateView>("grid");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const notesRef = React.useRef<HTMLTextAreaElement | null>(null);

  const sorted = React.useMemo(() => {
    return [...items].sort((a, b) => compareTemplates(a, b, sort));
  }, [items, sort]);

  const visibleByCategory = React.useMemo(() => {
    const map = new Map<TemplateCategory, TemplateItem[]>();
    for (const cat of TEMPLATE_CATEGORY_ORDER) map.set(cat, []);
    for (const item of sorted) {
      if (tab !== "all" && item.category !== tab) continue;
      map.get(item.category)!.push(item);
    }
    return map;
  }, [sorted, tab]);

  const selected = React.useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const updateNotes = (id: string, notes: string) => {
    setItems((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, notes, updatedAt: new Date().toISOString() }
          : t,
      ),
    );
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
      case "edit-notes": {
        if (!item) return;
        setSelectedId(item.id);
        requestAnimationFrame(() => notesRef.current?.focus());
        return;
      }
      case "archive":
        if (!item) return;
        toast(`Archived "${item.name}"`);
        return;
      case "delete":
        if (!item) return;
        setItems((prev) => prev.filter((t) => t.id !== item.id));
        setSelectedId((cur) => (cur === item.id ? null : cur));
        toast(`Deleted "${item.name}"`);
        return;
    }
  };

  const handlePreviewPlay = (item: TemplateItem, preview: AudioPreview) => {
    toast(`Playing preview: ${preview.name}`);
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

      <div className="flex flex-col gap-6 xl:flex-row">
        <main className="flex min-w-0 flex-1 flex-col gap-5">
          <TemplatesToolbar
            tab={tab}
            onTabChange={setTab}
            sort={sort}
            onSortChange={setSort}
            view={view}
            onViewChange={setView}
          />

          <div className="flex flex-col gap-6">
            {tab === "all" ? (
              TEMPLATE_CATEGORY_ORDER.map((cat) => {
                const sectionItems = visibleByCategory.get(cat) ?? [];
                if (sectionItems.length === 0) return null;
                return (
                  <TemplateSection
                    key={cat}
                    category={cat}
                    items={sectionItems}
                    view={view}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onAction={handleAction}
                  />
                );
              })
            ) : (
              <TemplateSection
                category={tab}
                items={visibleByCategory.get(tab) ?? []}
                view={view}
                selectedId={selectedId}
                showHeader={false}
                onSelect={setSelectedId}
                onAction={handleAction}
              />
            )}

            {tab !== "all" &&
              (visibleByCategory.get(tab) ?? []).length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-sm text-muted-foreground">
                  No {TEMPLATE_CATEGORY_LABELS[tab]} templates yet.
                </div>
              )}
          </div>
        </main>

        <aside className="w-full xl:w-[360px] xl:shrink-0">
          <TemplateDetailPanel
            ref={notesRef}
            item={selected}
            onBack={() => setSelectedId(null)}
            onAction={handleAction}
            onNotesChange={updateNotes}
            onPreviewPlay={handlePreviewPlay}
          />
        </aside>
      </div>
    </div>
  );
}

export function TemplatesPageClient({ items }: { items: TemplateItem[] }) {
  return (
    <ToastProvider>
      <TemplatesPageInner items={items} />
    </ToastProvider>
  );
}
