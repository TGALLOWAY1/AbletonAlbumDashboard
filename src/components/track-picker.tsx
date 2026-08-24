"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  clampHighlight,
  filterTrackOptions,
  nextHighlight,
  NO_HIGHLIGHT,
} from "@/lib/track-picker";
import type { TrackRow } from "@/lib/types";

/**
 * All the picker draws. Narrowed from `TrackRow` so callers can hand it the
 * lean `listTrackOptions` rows instead of paying for a full track fetch to
 * render a name in a dropdown; a `TrackRow` still satisfies it.
 */
export type PickableTrack = Pick<TrackRow, "id" | "name" | "status">;

/**
 * A search-and-pick combobox for one track.
 *
 * The suggestion list is a **popover**: it opens on focus or typing and closes
 * on pick, Escape, or a click outside. It used to render inline and
 * unconditionally whenever nothing was selected, which read as a permanently
 * stuck list — on the "Log past session" dialog it pushed the whole form down
 * the screen and made an optional field look like a required one. For the same
 * reason it is absolutely positioned: opening the list must not move the
 * controls underneath it.
 *
 * When the field is optional the list ends with an explicit "No specific
 * track" row. Leaving an input empty is not a choice the user can see they
 * made, and general studio work that advanced no single track is a real
 * session worth logging.
 */
export function TrackPicker({
  tracks,
  value,
  onChange,
  required,
  className,
}: {
  tracks: PickableTrack[];
  value: string | null;
  onChange: (id: string | null) => void;
  required?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(NO_HIGHLIGHT);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = useMemo(
    () => tracks.find((t) => t.id === value) ?? null,
    [tracks, value],
  );

  const filtered = useMemo(
    () => filterTrackOptions(tracks, query),
    [tracks, query],
  );

  // The list changes under the highlight as the query narrows it.
  const activeIndex = clampHighlight(filtered.length, highlight);

  const close = () => {
    setOpen(false);
    setHighlight(NO_HIGHLIGHT);
  };

  const pick = (id: string | null) => {
    onChange(id);
    setQuery("");
    close();
  };

  // Dismiss on a click anywhere outside. `pointerdown` rather than `click` so
  // the list is gone before the thing under it reacts, and so a tap on a phone
  // closes it without needing a second one.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight(
        nextHighlight(filtered.length, activeIndex, e.key === "ArrowDown" ? 1 : -1),
      );
      return;
    }
    if (e.key === "Enter") {
      if (open && activeIndex >= 0) {
        e.preventDefault();
        pick(filtered[activeIndex].id);
      }
      return;
    }
    if (e.key === "Escape" && open) {
      // Swallow it: inside a dialog an un-stopped Escape would close the whole
      // form out from under a user who only wanted to dismiss the list.
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(NO_HIGHLIGHT);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={required ? "Pick a track…" : "Search tracks (optional)"}
        className="h-8 pl-7"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listId}-${filtered[activeIndex].id}` : undefined
        }
      />

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-lg"
        >
          {filtered.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              No tracks match “{query.trim()}”.
            </p>
          )}
          {filtered.map((t, i) => (
            <button
              key={t.id}
              id={`${listId}-${t.id}`}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => pick(t.id)}
              onMouseMove={() => setHighlight(i)}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-surface-2",
                i === activeIndex && "bg-surface-2",
              )}
            >
              <span className="truncate">{t.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {t.status}
              </span>
            </button>
          ))}
          {!required && (
            <button
              type="button"
              onClick={() => pick(null)}
              className="mt-1 flex w-full items-center gap-2 rounded-sm border-t border-border px-2 pb-1.5 pt-2 text-left text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              No specific track — general studio work
            </button>
          )}
        </div>
      )}
    </div>
  );
}
