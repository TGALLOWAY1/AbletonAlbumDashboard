"use client";

import * as React from "react";
import { useTransition } from "react";
import { Disc3 } from "lucide-react";
import { assignTracksToAlbum } from "@/app/actions/tracks";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AlbumOption = { id: string; title: string | null };

// Radix Select items can't use an empty string value, so "no album" needs a
// sentinel that we translate back to null before calling the server action.
const NO_ALBUM = "__none__";

function albumLabel(title: string | null | undefined) {
  return title?.trim() || "Untitled album";
}

// Selecting an option here saves immediately (no separate "Save changes"
// step) and confirms via toast, so it works the same wherever it's rendered
// — desktop/mobile track detail, or the metadata editor.
export function TrackAlbumSelect({
  trackId,
  albumId,
  albums,
  variant = "default",
}: {
  trackId: string;
  albumId: string | null;
  albums: AlbumOption[];
  variant?: "default" | "compact";
}) {
  const [value, setValue] = React.useState(albumId ?? NO_ALBUM);
  const [prevAlbumId, setPrevAlbumId] = React.useState(albumId);
  const [pending, start] = useTransition();
  const { toast } = useToast();

  // Re-sync if the server-provided albumId changes underneath us (e.g. a
  // navigation to a different track), per React's "adjust state during
  // render" pattern — avoids an extra effect-driven render.
  if (albumId !== prevAlbumId) {
    setPrevAlbumId(albumId);
    setValue(albumId ?? NO_ALBUM);
  }

  function handleChange(next: string) {
    const previous = value;
    if (next === previous || pending) return;
    setValue(next);
    start(async () => {
      const nextAlbumId = next === NO_ALBUM ? null : next;
      try {
        const { count } = await assignTracksToAlbum(nextAlbumId, [trackId]);
        if (count === 0) {
          throw new Error("Track not found or update was blocked.");
        }
        toast(
          nextAlbumId
            ? `Moved to ${albumLabel(albums.find((a) => a.id === nextAlbumId)?.title)}`
            : "Removed from album",
        );
      } catch (e) {
        setValue(previous);
        toast((e as Error).message);
      }
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger
        aria-label="Album"
        className={cn(
          variant === "compact" &&
            "h-7 w-auto gap-1.5 border-none bg-transparent px-2 py-0 text-xs shadow-none hover:bg-surface-2",
        )}
      >
        <Disc3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="No album" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_ALBUM}>No album</SelectItem>
        {albums.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {albumLabel(a.title)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
