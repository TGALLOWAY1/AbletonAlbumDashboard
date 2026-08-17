"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { LibraryArtwork } from "@/components/library/library-artwork";
import { addToCollection } from "@/app/actions/library";
import {
  PRESET_CATEGORY_LABELS,
  loopStackSubtitle,
  loopStackMatches,
  presetMatches,
  type LibraryCollection,
  type LoopStack,
  type Preset,
} from "@/lib/data/library";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  type: "loopStack" | "preset";
  name: string;
  subtitle: string;
  artworkUrl?: string;
  alreadyIn: boolean;
  /** Whether the current search text matches — selection is independent of it. */
  matches: boolean;
};

/** Pick existing Library assets to file into a collection. */
export function AddToCollectionDialog({
  open,
  collection,
  loopStacks,
  presets,
  onOpenChange,
}: {
  open: boolean;
  collection: LibraryCollection;
  loopStacks: LoopStack[];
  presets: Preset[];
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        {/* Radix unmounts this on close, so the search box and selection start
            empty each time the picker opens. */}
        <AddToCollectionForm
          collection={collection}
          loopStacks={loopStacks}
          presets={presets}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddToCollectionForm({
  collection,
  loopStacks,
  presets,
  onOpenChange,
}: {
  collection: LibraryCollection;
  loopStacks: LoopStack[];
  presets: Preset[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [pending, setPending] = React.useState(false);

  const present = new Set(collection.items.map((i) => i.id));

  // Every asset, independent of the search box. Selections are made against
  // this list so narrowing the search after picking something doesn't silently
  // drop it on save — the count on the button would still include it.
  const allRows: Row[] = [
    ...loopStacks.map((s) => ({
      id: s.id,
      type: "loopStack" as const,
      name: s.name,
      subtitle: loopStackSubtitle(s) || "Loop Stack",
      artworkUrl: s.artworkUrl,
      alreadyIn: present.has(s.id),
      matches: loopStackMatches(s, query),
    })),
    ...presets.map((p) => ({
      id: p.id,
      type: "preset" as const,
      name: p.name,
      subtitle: [p.plugin, PRESET_CATEGORY_LABELS[p.category]]
        .filter(Boolean)
        .join(" · "),
      artworkUrl: p.artworkUrl,
      alreadyIn: present.has(p.id),
      matches: presetMatches(p, query),
    })),
  ];

  const rows = allRows.filter((r) => r.matches);
  const hiddenSelected = selected.filter(
    (id) => !rows.some((r) => r.id === id),
  ).length;

  const save = async () => {
    setPending(true);
    try {
      const refs = allRows
        .filter((r) => selected.includes(r.id))
        .map((r) => ({ type: r.type, id: r.id }));
      await addToCollection(collection.id, refs);
      router.refresh();
      toast(
        refs.length === 1
          ? `Added 1 item to ${collection.name}`
          : `Added ${refs.length} items to ${collection.name}`,
      );
      onOpenChange(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add to {collection.name}</DialogTitle>
        <DialogDescription>
          Assets stay in your library — a collection only points at them.
        </DialogDescription>
      </DialogHeader>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your library…"
          aria-label="Search your library"
          className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm outline-none focus-visible:border-primary/50"
        />
      </div>

      <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {rows.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            Nothing matches.
          </li>
        )}
        {hiddenSelected > 0 && (
          <li className="px-2 py-2 text-xs text-muted-foreground">
            {hiddenSelected === 1
              ? "1 selected item is hidden by your search — it will still be added."
              : `${hiddenSelected} selected items are hidden by your search — they will still be added.`}
          </li>
        )}
        {rows.map((row) => {
          const checked = selected.includes(row.id);
          return (
            <li key={`${row.type}-${row.id}`}>
              <button
                type="button"
                disabled={row.alreadyIn}
                aria-pressed={checked}
                onClick={() =>
                  setSelected((prev) =>
                    prev.includes(row.id)
                      ? prev.filter((s) => s !== row.id)
                      : [...prev, row.id],
                  )
                }
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
                  row.alreadyIn
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-surface-2",
                  checked && "bg-primary/10",
                )}
              >
                <LibraryArtwork
                  id={row.id}
                  artworkUrl={row.artworkUrl}
                  className="h-10 w-10 shrink-0 rounded-md border border-border"
                  waveformBars={8}
                  waveformHeight={18}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {row.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {row.alreadyIn
                      ? "Already in this collection"
                      : row.subtitle}
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button onClick={save} disabled={pending || selected.length === 0}>
          {pending
            ? "Adding…"
            : selected.length === 0
              ? "Add"
              : `Add ${selected.length}`}
        </Button>
      </DialogFooter>
    </>
  );
}
