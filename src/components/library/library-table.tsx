"use client";

import { MoreHorizontal, Play } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LibraryItem } from "@/lib/data/library-items";
import { MiniWaveform } from "./mini-waveform";

const CATEGORY_BADGE_VARIANT: Record<string, "default" | "primary" | "accent"> = {
  drums: "primary",
  instruments_presets: "accent",
  fx_racks: "default",
};

const CATEGORY_LABELS: Record<string, string> = {
  drums: "Drums",
  instruments_presets: "Instrument / Preset",
  fx_racks: "FX Rack",
};

export function LibraryTable({
  items,
  selectedId,
  onSelect,
  onPlay,
  onAction,
}: {
  items: LibraryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPlay: (item: LibraryItem) => void;
  onAction: (action: string, item: LibraryItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-sm text-muted-foreground">
        No items match your filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      {/* Mobile card list (<md) */}
      <ul className="flex flex-col md:hidden">
        {items.map((item) => {
          const selected = item.id === selectedId;
          return (
            <li
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex cursor-pointer flex-col gap-2 border-b border-border p-3 transition-colors last:border-b-0 hover:bg-surface-2/60",
                selected && "bg-primary/5",
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  aria-label="Play"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(item);
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                >
                  <Play className="h-4 w-4 translate-x-px" fill="currentColor" />
                </button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {item.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.source}
                  </span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Actions"
                        className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => onAction("Delete", item)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={CATEGORY_BADGE_VARIANT[item.category] || "default"}>
                  {CATEGORY_LABELS[item.category] || item.category}
                </Badge>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop grid table (md+) */}
      <div className="hidden grid-cols-[minmax(240px,2.2fr)_minmax(120px,1fr)_minmax(120px,1fr)_44px] items-center gap-3 border-b border-border bg-surface-2/60 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
        <div>Name</div>
        <div>Category</div>
        <div>Source</div>
        <div />
      </div>

      <ul className="hidden flex-col md:flex">
        {items.map((item) => {
          const selected = item.id === selectedId;
          return (
            <li
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "grid cursor-pointer grid-cols-[minmax(240px,2.2fr)_minmax(120px,1fr)_minmax(120px,1fr)_44px] items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-2/60",
                selected && "bg-primary/5",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  aria-label="Play"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(item);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105"
                >
                  <Play className="h-3.5 w-3.5 translate-x-px" fill="currentColor" />
                </button>
                <div className="hidden h-7 w-24 shrink-0 items-center sm:flex">
                  <MiniWaveform id={item.id} bars={36} height={24} />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {item.name}
                  </span>
                </div>
              </div>

              <div>
                <Badge variant={CATEGORY_BADGE_VARIANT[item.category] || "default"}>
                  {CATEGORY_LABELS[item.category] || item.category}
                </Badge>
              </div>

              <div className="truncate text-sm text-muted-foreground">
                {item.source}
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Actions"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => onAction("Delete", item)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
