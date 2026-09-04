"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CoverArt } from "@/components/cover-art";
import { cn } from "@/lib/utils";
import {
  buildTrackPickerOptions,
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
 *
 * `cover_image_url` is optional rather than required: some callers only have
 * the lean `listTrackOptions` shape (which carries the same artwork under a
 * camelCased field), and the picker degrades to initials when it's absent
 * rather than forcing every caller to fetch it.
 */
export type PickableTrack = Pick<TrackRow, "id" | "name" | "status"> & {
  cover_image_url?: string | null;
};

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
 * session worth logging. That row is a listbox option like any other, so the
 * arrow keys and Enter reach it — it is the whole point of the change, and a
 * pointer-only affordance would put it out of reach of the people most likely
 * to be typing in this field.
 */
export function TrackPicker({
  tracks,
  value,
  onChange,
  required,
  /**
   * "sm" (default) keeps the dense look used in dialogs. "lg" bumps the
   * input, selected chip and option rows to a 44px minimum tap height for
   * touch surfaces — see the focus runner's use of it.
   */
  size = "sm",
  className,
}: {
  tracks: PickableTrack[];
  value: string | null;
  onChange: (id: string | null) => void;
  required?: boolean;
  size?: "sm" | "lg";
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

  // One list for the pointer, the keyboard and the ARIA tree to share.
  const options = useMemo(
    () => buildTrackPickerOptions(filtered, !required),
    [filtered, required],
  );

  // The list changes under the highlight as the query narrows it.
  const activeIndex = clampHighlight(options.length, highlight);

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
          "flex items-center justify-between rounded-md border border-border bg-surface text-sm",
          size === "lg" ? "min-h-11 gap-2 px-3 py-2" : "px-3 py-2",
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <TrackThumb track={selected} size={size} />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Track
          </span>
          <span className="truncate font-medium">{selected.name}</span>
        </div>
        {!required && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={cn(
              "flex shrink-0 items-center justify-center text-muted-foreground hover:text-foreground",
              size === "lg" && "h-11 w-11",
            )}
            aria-label="Clear track"
          >
            <X className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} />
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
        nextHighlight(options.length, activeIndex, e.key === "ArrowDown" ? 1 : -1),
      );
      return;
    }
    if (e.key === "Enter") {
      if (open && activeIndex >= 0) {
        e.preventDefault();
        pick(options[activeIndex].trackId);
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
      <Search
        className={cn(
          "pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground",
          size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5",
        )}
      />
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
        className={size === "lg" ? "h-11 pl-9 text-base" : "h-8 pl-7"}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listId}-${options[activeIndex].key}` : undefined
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
              {query.trim()
                ? `No tracks match “${query.trim()}”.`
                : "No tracks yet."}
            </p>
          )}
          {options.map((option, i) => (
            <button
              key={option.key}
              id={`${listId}-${option.key}`}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              // The input is the only tab stop; the highlight moves with the
              // arrow keys and is announced via `aria-activedescendant`.
              tabIndex={-1}
              onClick={() => pick(option.trackId)}
              onMouseMove={() => setHighlight(i)}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 text-left text-sm hover:bg-surface-2",
                size === "lg" ? "min-h-11 py-2" : "py-1.5",
                i === activeIndex && "bg-surface-2",
                option.track === null &&
                  "mt-1 border-t border-border pb-1.5 pt-2 text-muted-foreground hover:text-foreground",
              )}
            >
              {option.track ? (
                <>
                  <TrackThumb track={option.track} size={size} />
                  <span className="truncate">{option.track.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {option.track.status}
                  </span>
                </>
              ) : (
                <span>No specific track — general studio work</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** The small cover swatch beside a track's name — initials when there's no artwork. */
function TrackThumb({
  track,
  size,
}: {
  track: PickableTrack;
  size: "sm" | "lg";
}) {
  const box = size === "lg" ? "h-7 w-7" : "h-5 w-5";
  return track.cover_image_url ? (
    <div className={cn("relative shrink-0 overflow-hidden rounded-sm", box)}>
      <CoverArt src={track.cover_image_url} sizes="28px" />
    </div>
  ) : (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-sm bg-surface-2 text-[9px] font-bold text-foreground/30",
        box,
      )}
    >
      {track.name.slice(0, 2).toUpperCase()}
    </div>
  );
}
