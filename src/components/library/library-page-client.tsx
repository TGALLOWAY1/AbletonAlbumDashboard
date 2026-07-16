"use client";

import * as React from "react";
import type {
  LibraryCategory,
  LibraryItem,
} from "@/lib/data/library-items";
import { AddInstrumentDialog } from "./add-instrument-dialog";
import { LibraryGrid } from "./library-grid";
import { LibraryInspector } from "./library-inspector";
import { LibraryPagination } from "./library-pagination";
import { LibraryTable } from "./library-table";
import {
  LibraryToolbar,
  type SortKey,
  type ViewMode,
} from "./library-toolbar";
import { useToast } from "@/components/toast";

const PAGE_SIZE = 10;

function compareItems(a: LibraryItem, b: LibraryItem, sort: SortKey): number {
  switch (sort) {
    case "name-desc":
      return b.name.localeCompare(a.name);
    case "name-asc":
    default:
      return a.name.localeCompare(b.name);
  }
}

function LibraryPageInner({ items: initialItems }: { items: LibraryItem[] }) {
  const { toast } = useToast();
  const [items, setItems] = React.useState<LibraryItem[]>(initialItems);

  const [tab, setTab] = React.useState<LibraryCategory | "all">("all");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("name-asc");
  const [view, setView] = React.useState<ViewMode>("list");
  const [page, setPage] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialItems[0]?.id ?? null,
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((it) => (tab === "all" ? true : it.category === tab))
      .filter((it) => {
        if (!q) return true;
        return (
          it.name.toLowerCase().includes(q) ||
          it.source.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => compareItems(a, b, sort));
  }, [items, tab, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const resetPage = <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const updateItem = (id: string, patch: Partial<LibraryItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  };

  const handleInstrumentAdded = (item: LibraryItem) => {
    setItems((prev) => [...prev, item]);
    setSelectedId(item.id);
    setPage(1);
    toast(`Added “${item.name}”`);
  };

  const handleAction = (action: string, item: LibraryItem) => {
    toast(action);
  };

  const handlePlay = (item: LibraryItem) => {
    setSelectedId(item.id);
    toast(`Playing preview: ${item.name}`);
  };

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <LibraryToolbar
          tab={tab}
          onTabChange={resetPage(setTab)}
          search={search}
          onSearchChange={resetPage(setSearch)}
          sort={sort}
          onSortChange={resetPage(setSort)}
          view={view}
          onViewChange={setView}
        />

        {tab === "instruments_presets" && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Your saved Instruments and Presets.
            </p>
            <AddInstrumentDialog onAdded={handleInstrumentAdded} />
          </div>
        )}

        {view === "list" ? (
          <LibraryTable
            items={paged}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onPlay={handlePlay}
            onAction={handleAction}
          />
        ) : (
          <LibraryGrid
            items={paged}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onPlay={handlePlay}
          />
        )}

        <LibraryPagination
          page={safePage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      <aside className="hidden w-full flex-col gap-5 lg:flex xl:w-[340px] xl:shrink-0">
        <LibraryInspector
          item={selected}
          onAction={handleAction}
          onPlay={handlePlay}
        />
      </aside>
    </div>
  );
}

export function LibraryPageClient({ items }: { items: LibraryItem[] }) {
  return <LibraryPageInner items={items} />;
}
