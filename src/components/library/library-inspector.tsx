"use client";

import { Play } from "lucide-react";
import type { LibraryItem } from "@/lib/data/library-items";
import { MiniWaveform } from "./mini-waveform";

const CATEGORY_LABELS: Record<string, string> = {
  drums: "Drums",
  instruments_presets: "Instrument / Preset",
  fx_racks: "FX Rack",
};

export function LibraryInspector({
  item,
  onAction,
  onPlay,
}: {
  item: LibraryItem | null;
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Meta label="Category" value={CATEGORY_LABELS[item.category] || item.category} />
        <Meta label="Source" value={item.source} />
      </div>

      {item.notes && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Notes
          </div>
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {item.notes}
          </p>
        </div>
      )}
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
