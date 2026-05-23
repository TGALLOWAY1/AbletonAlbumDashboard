"use client";

import { Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LibraryItem } from "@/lib/data/library-items";
import { libraryItemBadgeLabel } from "@/lib/data/library-items";
import { MiniWaveform } from "./mini-waveform";
import { StarRating } from "./star-rating";

export function LibraryGrid({
  items,
  selectedId,
  onSelect,
  onPlay,
}: {
  items: LibraryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPlay: (item: LibraryItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-sm text-muted-foreground">
        No items match your filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 text-left shadow-sm transition-colors hover:bg-surface-2/40",
              selected && "border-primary/40 bg-primary/5",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{item.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {item.sourceProject}
                </div>
              </div>
              <Badge variant="primary">{libraryItemBadgeLabel(item)}</Badge>
            </div>

            <div className="flex items-center gap-3">
              <span
                role="button"
                tabIndex={0}
                aria-label="Play"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay(item);
                }}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
              >
                <Play className="h-3.5 w-3.5 translate-x-px" fill="currentColor" />
              </span>
              <div className="min-w-0 flex-1">
                <MiniWaveform id={item.id} bars={48} height={28} />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="tabular-nums">
                {item.bpm ?? "—"} BPM · {item.key ?? "—"}
              </span>
              <StarRating value={item.rating} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
