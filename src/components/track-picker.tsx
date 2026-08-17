"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TrackRow } from "@/lib/types";

export function TrackPicker({
  tracks,
  value,
  onChange,
  required,
  className,
}: {
  tracks: TrackRow[];
  value: string | null;
  onChange: (id: string | null) => void;
  required?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const selected = useMemo(
    () => tracks.find((t) => t.id === value) ?? null,
    [tracks, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tracks.slice(0, 6);
    return tracks
      .filter((t) => t.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [tracks, query]);

  if (selected) {
    return (
      <div
        className={cn(
          "flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm",
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Track
          </span>
          <span className="truncate font-medium">{selected.name}</span>
        </div>
        {!required && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Clear track"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={required ? "Pick a track…" : "Pick a track (optional)"}
          className="h-8 pl-7"
        />
      </div>
      {filtered.length > 0 && (
        <ul className="flex max-h-40 flex-col gap-0.5 overflow-y-auto rounded-md border border-border bg-surface p-1">
          {filtered.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(t.id);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-surface-2"
              >
                <span className="truncate">{t.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {t.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
