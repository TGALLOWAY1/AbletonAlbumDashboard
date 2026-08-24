"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Pin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { setTrackPinned } from "@/app/actions/tracks";
import type { TrackOption } from "@/lib/data/tracks";
import { MAX_PINNED_TRACKS } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLLAPSED_COUNT = 4;

/**
 * "What else could be on the list" — every unpinned track, most recently
 * worked first, one click from the shortlist.
 *
 * This exists because pinning has to be as cheap as unpinning. Under the old
 * model the dashboard showed the active album's tracks and adding a different
 * one meant editing album membership on another page; if putting a song on the
 * list were still a trip to `/tracks`, the shortlist would go stale the same
 * way. Full and self-serve: at the cap the buttons disable and say what to do
 * about it, rather than letting the click fail server-side.
 */
export function PinPicker({
  tracks,
  pinnedCount,
}: {
  /** Unpinned, non-archived tracks. */
  tracks: TrackOption[];
  pinnedCount: number;
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  // A track that has just been pinned belongs in the list above, not here, so
  // it leaves immediately. `useOptimistic` rather than a `Set` in state
  // because it reconciles itself in both directions: the revalidated props
  // arrive without the track (and the optimistic removal is dropped as
  // redundant), or the action fails and the row simply comes back when the
  // transition ends. Tracking it by hand meant double-counting the pin
  // against the cap for as long as both the new props and the local set
  // remembered it.
  const [available, hideOptimistically] = useOptimistic(
    tracks,
    (state: TrackOption[], id: string) => state.filter((t) => t.id !== id),
  );

  const atCap =
    pinnedCount + (tracks.length - available.length) >= MAX_PINNED_TRACKS;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((t) => t.name.toLowerCase().includes(q));
  }, [available, query]);

  const visible = showAll || query ? filtered : filtered.slice(0, COLLAPSED_COUNT);
  const hidden = filtered.length - visible.length;

  if (tracks.length === 0) return null;

  const pin = (track: TrackOption) => {
    startTransition(async () => {
      hideOptimistically(track.id);
      const { error } = await setTrackPinned(track.id, true);
      if (error) toast(error);
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pin another track
        </h2>
        {atCap && (
          <p className="text-xs text-muted-foreground">
            Shortlist is full — unpin one, or finish it, to make room.
          </p>
        )}
      </div>

      <Card className="flex flex-col gap-2 p-3">
        {available.length > COLLAPSED_COUNT && (
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${available.length} tracks…`}
              className="h-9 pl-8"
              aria-label="Search tracks to pin"
            />
          </div>
        )}

        {visible.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            No track matches “{query.trim()}”.
          </p>
        ) : (
          <ul className="flex flex-col">
            {visible.map((track) => (
              <li
                key={track.id}
                className="flex items-center gap-2 border-b border-border/60 py-1.5 last:border-b-0"
              >
                <Link
                  href={`/tracks/${track.id}`}
                  className="min-w-0 flex-1 truncate text-sm hover:underline"
                >
                  {track.name}
                </Link>
                <span
                  className={cn(
                    "shrink-0 text-[11px] capitalize text-muted-foreground",
                    track.status === "completed" && "text-primary",
                  )}
                >
                  {track.status}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0"
                  disabled={atCap || pending}
                  onClick={() => pin(track)}
                  title={
                    atCap
                      ? `Already at ${MAX_PINNED_TRACKS} pinned tracks`
                      : `Pin ${track.name}`
                  }
                >
                  <Pin className="h-3.5 w-3.5" />
                  Pin
                </Button>
              </li>
            ))}
          </ul>
        )}

        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="self-start px-1 text-xs font-medium text-primary hover:underline"
          >
            Show {hidden} more
          </button>
        )}
      </Card>
    </section>
  );
}
