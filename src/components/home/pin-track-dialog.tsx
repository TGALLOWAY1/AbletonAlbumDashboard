"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Pin, PinOff, Plus, Search } from "lucide-react";
import { CoverArt } from "@/components/cover-art";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { setTrackPinned } from "@/app/actions/tracks";
import type { TrackOption } from "@/lib/data/tracks";
import { filterPinPickerRows, orderPinPickerRows } from "@/lib/pin-picker";
import { MAX_PINNED_TRACKS } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Fewer rows than this are quicker to scan than to search. */
const SEARCH_MIN_ROWS = 7;

/**
 * The "+" at the top of the shortlist, and the dialog it opens.
 *
 * This used to be a "Pin another track" section under the shortlist: a search
 * box and a list that cost most of a phone screen on every visit, to serve an
 * action taken now and then. As a dialog it costs one icon.
 *
 * Pinning is still as cheap as unpinning — the reason the picker existed at
 * all (a shortlist that takes a trip to `/tracks` to change goes stale). And
 * because the dialog covers the shortlist's own unpin buttons, it lists the
 * shortlist too (`orderPinPickerRows`), so at the cap a swap happens here
 * instead of being a dead end of disabled Pin buttons.
 *
 * Controlled, because the empty shortlist has its own "Pin a track" button
 * that opens the same dialog.
 */
export function PinTrackDialog({
  open,
  onOpenChange,
  options,
  pinnedIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Every non-archived track, most recently worked first (`listTrackOptions`). */
  options: TrackOption[];
  /** The shortlist, in priority order. */
  pinnedIds: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label="Pin a track"
          title="Pin a track"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent
        // Anchored near the top rather than centred: the list shrinks as you
        // type, and a centred dialog would re-centre — moving the search box
        // — on every keystroke. Only the list scrolls.
        className="top-3 flex max-h-[calc(100dvh-1.5rem)] translate-y-0 flex-col gap-3 overflow-hidden sm:top-[12vh] sm:max-h-[76vh]"
        onOpenAutoFocus={(e) => {
          // Radix focuses the search box on open. On a touchscreen that
          // raises the keyboard over the list before anyone has asked to
          // type, so focus the dialog itself there; search is one tap away.
          if (!window.matchMedia("(pointer: fine)").matches) {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.focus();
          }
        }}
      >
        <PinTrackDialogBody options={options} pinnedIds={pinnedIds} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Split out so its state lives exactly as long as one opening of the dialog:
 * Radix unmounts the content on close, so every open starts with an empty
 * search and a fresh row order.
 */
function PinTrackDialogBody({
  options,
  pinnedIds,
}: {
  options: TrackOption[];
  pinnedIds: string[];
}) {
  // The order is decided once, when the dialog opens; see `orderPinPickerRows`
  // for why rows must not move while it is up.
  const [openedWith] = useState(pinnedIds);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  // Same reconciliation as the shortlist's own list: the revalidated props
  // replace the optimistic change when the action lands, or the action fails
  // and the change is simply dropped when the transition ends.
  const [pinned, applyPin] = useOptimistic(
    pinnedIds,
    (state: string[], change: { id: string; pinned: boolean }) => {
      const without = state.filter((id) => id !== change.id);
      return change.pinned ? [...without, change.id] : without;
    },
  );
  const atCap = pinned.length >= MAX_PINNED_TRACKS;

  const rows = useMemo(
    () => orderPinPickerRows(options, openedWith),
    [options, openedWith],
  );
  const visible = useMemo(
    () => filterPinPickerRows(rows, query),
    [rows, query],
  );

  const toggle = (track: TrackOption, pin: boolean) => {
    startTransition(async () => {
      applyPin({ id: track.id, pinned: pin });
      const { error } = await setTrackPinned(track.id, pin);
      if (error) toast(error);
    });
  };

  return (
    <>
      <DialogHeader className="pr-10">
        <DialogTitle>Pin a track</DialogTitle>
        <DialogDescription>
          {atCap
            ? `${MAX_PINNED_TRACKS} of ${MAX_PINNED_TRACKS} pinned — unpin one to make room.`
            : `${pinned.length} of ${MAX_PINNED_TRACKS} pinned. Drag them on the dashboard to set priority.`}
        </DialogDescription>
      </DialogHeader>

      {rows.length >= SEARCH_MIN_ROWS && (
        <div className="relative shrink-0">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${rows.length} tracks…`}
            className="pl-8"
            aria-label="Search tracks"
            enterKeyHint="search"
            autoComplete="off"
          />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing to pin yet.{" "}
          <Link href="/tracks/new" className="font-medium text-primary hover:underline">
            Add a track
          </Link>
        </p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No track matches “{query.trim()}”.
        </p>
      ) : (
        <ul className="-mx-1 flex min-h-0 flex-col overflow-y-auto px-1">
          {visible.map((track) => {
            const position = pinned.indexOf(track.id) + 1;
            const isPinned = position > 0;
            return (
              <li
                key={track.id}
                className="flex items-center gap-3 border-b border-border/60 py-2 last:border-b-0"
              >
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary/20 via-surface-2 to-accent/15">
                  {track.coverImageUrl ? (
                    <CoverArt src={track.coverImageUrl} sizes="36px" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-foreground/30">
                      {track.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {track.name}
                  </span>
                  <span
                    className={cn(
                      "block text-[11px] capitalize",
                      isPinned ? "font-medium text-primary" : "text-muted-foreground",
                    )}
                  >
                    {isPinned ? `Pinned · ${position}` : track.status}
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  // Fixed width so the column of buttons stays straight as
                  // labels flip between "Pin" and "Unpin".
                  className="w-[5.75rem] shrink-0"
                  // Every toggle waits for the one in flight: the cap check in
                  // `setTrackPinned` is a count-then-write, so two pins racing
                  // could both pass it.
                  disabled={pending || (!isPinned && atCap)}
                  onClick={() => toggle(track, !isPinned)}
                >
                  {isPinned ? (
                    <PinOff className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Pin className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {isPinned ? "Unpin" : "Pin"}
                  <span className="sr-only"> {track.name}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
