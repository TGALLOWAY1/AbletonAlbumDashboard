"use client";

import * as React from "react";
import type {
  LibraryCategory,
  LibraryItem,
} from "@/lib/data/library-items";
import {
  LibraryFiltersCard,
  DEFAULT_LIBRARY_FILTERS,
  type LibraryFilters,
} from "./library-filters-card";
import { LibraryGrid } from "./library-grid";
import { LibraryInspector } from "./library-inspector";
import { LibraryPagination } from "./library-pagination";
import { LibraryTable } from "./library-table";
import {
  LibraryToolbar,
  type SortKey,
  type ViewMode,
} from "./library-toolbar";
import { ToastProvider, useToast } from "./toast";

const PAGE_SIZE = 10;

function bpmInBucket(bpm: number | null, bucket: string): boolean {
  if (bucket === "all") return true;
  if (bpm == null) return false;
  const [lo, hi] = bucket.split("-").map(Number);
  return bpm >= lo && bpm < hi;
}

function compareItems(a: LibraryItem, b: LibraryItem, sort: SortKey): number {
  switch (sort) {
    case "rating":
      return b.rating - a.rating;
    case "name-asc":
      return a.name.localeCompare(b.name);
    case "name-desc":
      return b.name.localeCompare(a.name);
    case "recent":
    default:
      return (
        new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      );
  }
}

function LibraryPageInner({ items: initialItems }: { items: LibraryItem[] }) {
  const { toast } = useToast();
  const [items, setItems] = React.useState<LibraryItem[]>(initialItems);

  const [tab, setTab] = React.useState<LibraryCategory | "all">("all");
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("all");
  const [musicKey, setMusicKey] = React.useState("all");
  const [bpm, setBpm] = React.useState("all");
  const [sort, setSort] = React.useState<SortKey>("recent");
  const [view, setView] = React.useState<ViewMode>("list");
  const [page, setPage] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialItems[0]?.id ?? null,
  );
  const [filters, setFilters] = React.useState<LibraryFilters>(
    DEFAULT_LIBRARY_FILTERS,
  );

  const sources = React.useMemo(
    () => Array.from(new Set(items.map((i) => i.sourceProject))).sort(),
    [items],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((it) => (tab === "all" ? true : it.category === tab))
      .filter((it) => (type === "all" ? true : it.type === type))
      .filter((it) => (musicKey === "all" ? true : it.key === musicKey))
      .filter((it) => bpmInBucket(it.bpm, bpm))
      .filter((it) => {
        if (!q) return true;
        return (
          it.name.toLowerCase().includes(q) ||
          it.sourceProject.toLowerCase().includes(q) ||
          it.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .filter((it) => (filters.favoritesOnly ? it.favorite : true))
      .filter((it) => it.rating >= filters.ratingMin)
      .filter((it) =>
        filters.tags.length === 0
          ? true
          : filters.tags.some((t) =>
              it.tags.map((x) => x.toLowerCase()).includes(t.toLowerCase()),
            ),
      )
      .filter((it) =>
        filters.mood === "all" || !it.mood ? true : it.mood === filters.mood,
      )
      .filter((it) =>
        filters.genre === "all" || !it.genre
          ? true
          : it.genre === filters.genre,
      )
      .filter((it) =>
        filters.key === "all" ? true : it.key === filters.key,
      )
      .filter((it) =>
        it.bpm == null
          ? true
          : it.bpm >= filters.bpmMin && it.bpm <= filters.bpmMax,
      )
      .filter((it) =>
        it.energy == null ? true : it.energy <= filters.energy,
      )
      .filter((it) =>
        filters.source === "all" ? true : it.sourceProject === filters.source,
      )
      .sort((a, b) => compareItems(a, b, sort));
  }, [items, tab, type, musicKey, bpm, search, filters, sort]);

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

  const handleAction = (action: string, item: LibraryItem) => {
    if (action === "Toggle favorite") {
      updateItem(item.id, { favorite: !item.favorite });
      toast(item.favorite ? "Removed from favorites" : "Added to favorites");
      return;
    }
    if (action === "Open in Finder") {
      toast(
        item.filePath
          ? `Would open ${item.filePath} in Finder`
          : "Open in Finder requires desktop integration",
      );
      return;
    }
    if (action === "Reveal in Project") {
      toast(
        item.projectPath
          ? `Would reveal in ${item.projectPath}`
          : "No source project path for this item",
      );
      return;
    }
    if (action === "Add to Pack") {
      toast(`Added “${item.name}” to pack`);
      return;
    }
    toast(action);
  };

  const handlePlay = (item: LibraryItem) => {
    setSelectedId(item.id);
    toast(`Playing preview: ${item.name}`);
  };

  const handleToggleFavorite = (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    updateItem(id, { favorite: !it.favorite });
    toast(it.favorite ? "Removed from favorites" : "Added to favorites");
  };

  const handleRatingChange = (id: string, rating: number) => {
    updateItem(id, { rating: rating as LibraryItem["rating"] });
  };

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <LibraryToolbar
          tab={tab}
          onTabChange={resetPage(setTab)}
          search={search}
          onSearchChange={resetPage(setSearch)}
          type={type}
          onTypeChange={resetPage(setType)}
          musicKey={musicKey}
          onKeyChange={resetPage(setMusicKey)}
          bpm={bpm}
          onBpmChange={resetPage(setBpm)}
          sort={sort}
          onSortChange={resetPage(setSort)}
          view={view}
          onViewChange={setView}
        />

        {view === "list" ? (
          <LibraryTable
            items={paged}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onPlay={handlePlay}
            onAction={handleAction}
            onRatingChange={handleRatingChange}
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

      <aside className="flex w-full flex-col gap-5 xl:w-[340px] xl:shrink-0">
        <LibraryFiltersCard
          filters={filters}
          onChange={resetPage(setFilters)}
          onClear={() => {
            setFilters(DEFAULT_LIBRARY_FILTERS);
            setPage(1);
          }}
          sources={sources}
        />
        <LibraryInspector
          item={selected}
          onToggleFavorite={handleToggleFavorite}
          onRatingChange={handleRatingChange}
          onAction={handleAction}
          onPlay={handlePlay}
        />
      </aside>
    </div>
  );
}

export function LibraryPageClient({ items }: { items: LibraryItem[] }) {
  return (
    <ToastProvider>
      <LibraryPageInner items={items} />
    </ToastProvider>
  );
}
