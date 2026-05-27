"use client";

import { useRef, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Play, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/lib/types";
import type { SampleVM, StatusMap } from "@/lib/samples/types";

export type ListFilter = "all" | "reviewed" | "not_reviewed";
export type ListSort = "name" | "type";

function StatusDot({ status }: { status: ReviewStatus }) {
  if (status === "added_to_favorites")
    return <span className="h-2.5 w-2.5 rounded-full bg-green-500" />;
  if (status === "reviewed_not_added")
    return <span className="h-2.5 w-2.5 rounded-full bg-red-500" />;
  return <span className="h-2.5 w-2.5 rounded-full border border-muted-foreground" />;
}

export function SampleList({
  samples,
  statuses,
  selectedKey,
  onSelect,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  searchRef,
}: {
  samples: SampleVM[];
  statuses: StatusMap;
  selectedKey: string | null;
  onSelect: (vm: SampleVM) => void;
  search: string;
  onSearchChange: (v: string) => void;
  filter: ListFilter;
  onFilterChange: (v: ListFilter) => void;
  sort: ListSort;
  onSortChange: (v: ListSort) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: samples.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search samples…"
            className="pl-8"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value as ListFilter)}
          className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm"
          aria-label="Filter"
        >
          <option value="all">All</option>
          <option value="not_reviewed">Not reviewed</option>
          <option value="reviewed">Reviewed</option>
        </select>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as ListSort)}
          className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm"
          aria-label="Sort"
        >
          <option value="name">Name</option>
          <option value="type">Type</option>
        </select>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto">
        {samples.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted-foreground">
            No samples to show. Select a folder in the left panel.
          </p>
        ) : (
          <div
            style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}
          >
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const vm = samples[vi.index];
              const status = statuses[vm.key] ?? "not_reviewed";
              const selected = vm.key === selectedKey;
              return (
                <div
                  key={vm.key}
                  className={cn(
                    "absolute left-0 top-0 flex w-full items-center gap-2 border-b border-border/50 px-3 text-sm hover:bg-surface-2",
                    selected && "bg-surface-2",
                  )}
                  style={{
                    height: vi.size,
                    transform: `translateY(${vi.start}px)`,
                  }}
                  onClick={() => onSelect(vm)}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(vm);
                    }}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Play"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                  <StatusDot status={status} />
                  <span className="min-w-0 flex-1 truncate">{vm.name}</span>
                  <span className="hidden w-20 shrink-0 truncate text-xs text-muted-foreground sm:block">
                    {vm.type}
                  </span>
                  <span className="hidden max-w-[40%] shrink-0 truncate text-xs text-muted-foreground md:block">
                    {vm.relPath}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
