"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  LibraryCategory,
  LibraryItem,
} from "@/lib/data/library-items";
import { LibraryDeleteDialog } from "./library-delete-dialog";
import { LibraryGrid } from "./library-grid";
import { LibraryInspector } from "./library-inspector";
import { LibraryItemDialog } from "./library-item-dialog";
import { LibraryNotesDialog } from "./library-notes-dialog";
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

  // Dialogs. editorOpen is separate from editorItem so "add" (item null) has
  // an explicit open state.
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editorItem, setEditorItem] = React.useState<LibraryItem | null>(null);
  const [notesItem, setNotesItem] = React.useState<LibraryItem | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<LibraryItem | null>(null);

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

  const openAdd = () => {
    setEditorItem(null);
    setEditorOpen(true);
  };

  const openEdit = (item: LibraryItem) => {
    setEditorItem(item);
    setEditorOpen(true);
  };

  const handleSaved = (saved: LibraryItem) => {
    const exists = items.some((it) => it.id === saved.id);
    setItems((prev) =>
      exists
        ? prev.map((it) => (it.id === saved.id ? saved : it))
        : [saved, ...prev],
    );
    setSelectedId(saved.id);
    toast(exists ? `Saved “${saved.name}”` : `Added “${saved.name}”`);
  };

  const handleDeleted = (id: string) => {
    const deleted = items.find((it) => it.id === id);
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (selectedId === id) setSelectedId(null);
    toast(deleted ? `Deleted “${deleted.name}”` : "Item deleted");
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

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? "Your library is empty — add your first item."
              : "Your saved drums, instruments, presets, and FX racks."}
          </p>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>

        {view === "list" ? (
          <LibraryTable
            items={paged}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={openEdit}
            onDelete={setDeleteItem}
            onNotes={setNotesItem}
          />
        ) : (
          <LibraryGrid
            items={paged}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={openEdit}
            onDelete={setDeleteItem}
            onNotes={setNotesItem}
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
          onEdit={openEdit}
          onDelete={setDeleteItem}
          onNotes={setNotesItem}
        />
      </aside>

      <LibraryItemDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        item={editorItem}
        defaultCategory={tab === "all" ? "instruments_presets" : tab}
        onSaved={handleSaved}
      />

      <LibraryNotesDialog
        open={notesItem !== null}
        onOpenChange={(open) => {
          if (!open) setNotesItem(null);
        }}
        item={notesItem}
        onSaved={handleSaved}
      />

      <LibraryDeleteDialog
        open={deleteItem !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        item={deleteItem}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

export function LibraryPageClient({ items }: { items: LibraryItem[] }) {
  return <LibraryPageInner items={items} />;
}
