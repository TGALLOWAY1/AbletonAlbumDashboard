"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LibraryFilters, LibrarySort } from "@/lib/data/library";

/**
 * Search filters as you type — there is no submit. The filter button opens a
 * sheet for the handful of switches that would otherwise clutter the browse
 * screen: favourites, Core, and sort order.
 */
export function LibrarySearchRow({
  filters,
  onFiltersChange,
  placeholder = "Search loop stacks and presets…",
  showCoreFilter = true,
}: {
  filters: LibraryFilters;
  onFiltersChange: (next: LibraryFilters) => void;
  placeholder?: string;
  showCoreFilter?: boolean;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const activeCount =
    (filters.favoritesOnly ? 1 : 0) +
    (filters.coreOnly ? 1 : 0) +
    (filters.sort !== "recent" ? 1 : 0);

  const set = (patch: Partial<LibraryFilters>) =>
    onFiltersChange({ ...filters, ...patch });

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder={placeholder}
          aria-label="Search the library"
          className="h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary/50 [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.query && (
          <button
            type="button"
            onClick={() => set({ query: "" })}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label={
          activeCount ? `Filters, ${activeCount} active` : "Filters and sorting"
        }
        className={cn(
          "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors",
          activeCount
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border bg-surface text-muted-foreground hover:text-foreground",
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        {activeCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground">
            {activeCount}
          </span>
        )}
      </button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[80vh] rounded-t-xl p-5 md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-96 md:max-h-none md:rounded-none"
        >
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Narrow the shelves without leaving the browse view.
          </SheetDescription>

          <div className="flex flex-col gap-4">
            <ToggleRow
              label="Favorites only"
              hint="The ones you starred."
              checked={filters.favoritesOnly}
              onChange={(v) => set({ favoritesOnly: v })}
            />
            {showCoreFilter && (
              <ToggleRow
                label="Core presets only"
                hint="Your go-to sounds."
                checked={filters.coreOnly}
                onChange={(v) => set({ coreOnly: v })}
              />
            )}

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Sort</span>
              <div className="flex gap-2">
                {(
                  [
                    ["recent", "Recently added"],
                    ["name", "Name"],
                  ] as Array<[LibrarySort, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set({ sort: value })}
                    aria-pressed={filters.sort === value}
                    className={cn(
                      "h-9 flex-1 rounded-md border px-3 text-sm font-medium transition-colors",
                      filters.sort === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-foreground hover:bg-surface-2",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Favorites always sort first.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  favoritesOnly: false,
                  coreOnly: false,
                  sort: "recent",
                })
              }
              disabled={activeCount === 0}
            >
              Reset filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <span
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-sm transition-transform",
            checked ? "translate-x-[1.125rem]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
