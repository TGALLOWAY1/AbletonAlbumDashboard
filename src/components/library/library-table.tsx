"use client";

import { format, parseISO } from "date-fns";
import { MoreHorizontal, Play } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  LibraryItem,
  LibraryType,
} from "@/lib/data/library-items";
import { LIBRARY_TYPE_LABELS } from "@/lib/data/library-items";
import { MiniWaveform } from "./mini-waveform";
import { StarRating } from "./star-rating";

const TYPE_BADGE_VARIANT: Record<
  LibraryType,
  "default" | "primary" | "accent" | "warning" | "danger"
> = {
  drum: "primary",
  bass: "accent",
  lead: "primary",
  atmos: "default",
  vocal: "warning",
  fx: "danger",
  chord: "primary",
  midi: "default",
};

export function LibraryTable({
  items,
  selectedId,
  onSelect,
  onPlay,
  onAction,
  onRatingChange,
}: {
  items: LibraryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPlay: (item: LibraryItem) => void;
  onAction: (action: string, item: LibraryItem) => void;
  onRatingChange: (id: string, rating: number) => void;
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
                    {item.sourceProject}
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
                        onSelect={() => onAction("Open in Finder", item)}
                      >
                        Open in Finder
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => onAction("Reveal in Project", item)}
                      >
                        Reveal in Project
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => onAction("Add to Pack", item)}
                      >
                        Add to Pack
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => onAction("Toggle favorite", item)}
                      >
                        {item.favorite
                          ? "Remove favorite"
                          : "Mark as favorite"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={TYPE_BADGE_VARIANT[item.type]}>
                  {LIBRARY_TYPE_LABELS[item.type]}
                </Badge>
                {item.key && (
                  <span className="tabular-nums">{item.key}</span>
                )}
                {item.bpm != null && (
                  <span className="tabular-nums">{item.bpm} BPM</span>
                )}
                <span className="ml-auto">
                  {format(parseISO(item.addedAt), "MMM d")}
                </span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <StarRating
                  value={item.rating}
                  onChange={(v) => onRatingChange(item.id, v)}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop grid table (md+) */}
      <div className="hidden grid-cols-[minmax(240px,2.2fr)_minmax(96px,0.9fr)_minmax(70px,0.6fr)_minmax(60px,0.5fr)_minmax(120px,1fr)_minmax(110px,0.9fr)_minmax(120px,0.9fr)_44px] items-center gap-3 border-b border-border bg-surface-2/60 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
        <div>Name</div>
        <div>Type</div>
        <div>Key</div>
        <div>BPM</div>
        <div>Source Project</div>
        <div>Added</div>
        <div>Rating</div>
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
                "grid cursor-pointer grid-cols-[minmax(240px,2.2fr)_minmax(96px,0.9fr)_minmax(70px,0.6fr)_minmax(60px,0.5fr)_minmax(120px,1fr)_minmax(110px,0.9fr)_minmax(120px,0.9fr)_44px] items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-2/60",
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
                  <span className="truncate text-[11px] text-muted-foreground">
                    {LIBRARY_TYPE_LABELS[item.type]}
                  </span>
                </div>
              </div>

              <div>
                <Badge variant={TYPE_BADGE_VARIANT[item.type]}>
                  {LIBRARY_TYPE_LABELS[item.type]}
                </Badge>
              </div>

              <div className="text-sm text-muted-foreground">
                {item.key ?? "—"}
              </div>

              <div className="text-sm tabular-nums text-muted-foreground">
                {item.bpm ?? "—"}
              </div>

              <div className="truncate text-sm text-muted-foreground">
                {item.sourceProject}
              </div>

              <div className="text-sm text-muted-foreground">
                {format(parseISO(item.addedAt), "MMM d, yyyy")}
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                <StarRating
                  value={item.rating}
                  onChange={(v) => onRatingChange(item.id, v)}
                />
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
                      onSelect={() => onAction("Open in Finder", item)}
                    >
                      Open in Finder
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => onAction("Reveal in Project", item)}
                    >
                      Reveal in Project
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => onAction("Add to Pack", item)}
                    >
                      Add to Pack
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => onAction("Toggle favorite", item)}
                    >
                      {item.favorite ? "Remove favorite" : "Mark as favorite"}
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
