"use client";

import { Folder, FolderOpen, Package, Play, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LibraryItem } from "@/lib/data/library-items";
import { LIBRARY_TYPE_LABELS } from "@/lib/data/library-items";
import { MiniWaveform } from "./mini-waveform";
import { StarRating } from "./star-rating";

function formatDuration(sec: number) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function LibraryInspector({
  item,
  onToggleFavorite,
  onRatingChange,
  onAction,
  onPlay,
}: {
  item: LibraryItem | null;
  onToggleFavorite: (id: string) => void;
  onRatingChange: (id: string, rating: number) => void;
  onAction: (action: string, item: LibraryItem) => void;
  onPlay: (item: LibraryItem) => void;
}) {
  if (!item) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 text-sm text-muted-foreground shadow-sm">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Preview
        </h3>
        <p>Select an item from the table to see its preview and details.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Preview
        </h3>
        <button
          type="button"
          aria-label={item.favorite ? "Unfavorite" : "Favorite"}
          onClick={() => onToggleFavorite(item.id)}
        >
          <Star
            className={cn(
              "h-4 w-4 transition-colors",
              item.favorite
                ? "fill-primary text-primary"
                : "fill-transparent text-muted-foreground hover:text-foreground",
            )}
          />
        </button>
      </div>

      <div>
        <div className="truncate text-sm font-semibold text-foreground">
          {item.name}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Play preview"
          onClick={() => onPlay(item)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105"
        >
          <Play className="h-4 w-4 translate-x-px" fill="currentColor" />
        </button>
        <div className="min-w-0 flex-1">
          <MiniWaveform id={item.id} bars={120} height={36} />
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
            <span>0:00</span>
            <span>{formatDuration(item.durationSec)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Meta label="Type" value={LIBRARY_TYPE_LABELS[item.type]} />
        <Meta label="BPM" value={item.bpm ?? "—"} />
        <Meta label="Key" value={item.key ?? "—"} />
        <Meta label="Source" value={item.sourceProject} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Rating
        </div>
        <StarRating
          value={item.rating}
          size={16}
          onChange={(v) => onRatingChange(item.id, v)}
        />
      </div>

      {item.tags.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {item.notes && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Notes
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {item.notes}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          variant="default"
          className="w-full justify-start"
          onClick={() => onAction("Open in Finder", item)}
        >
          <FolderOpen className="h-4 w-4" />
          Open in Finder
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => onAction("Reveal in Project", item)}
        >
          <Folder className="h-4 w-4" />
          Reveal in Project
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => onAction("Add to Pack", item)}
        >
          <Package className="h-4 w-4" />
          Add to Pack
        </Button>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
