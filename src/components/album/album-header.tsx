"use client";

import * as React from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  CalendarDays,
  Check,
  Disc3,
  Music4,
  Pencil,
  Star,
  X,
} from "lucide-react";
import { setActiveAlbum, updateAlbum } from "@/app/actions/album";
import { CoverArt } from "@/components/cover-art";
import { CoverImageUpload } from "@/components/cover-image-upload";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { OWNER_ID } from "@/lib/owner";

export type AlbumHeaderAlbum = {
  id: string;
  title: string | null;
  // Genre is an album-level fact — one record, one genre — rather than
  // something each track carries (migration 0021).
  genre: string | null;
  cover_image_url: string | null;
  start_date: string | null;
  is_active: boolean;
};

/**
 * Album identity strip: artwork, title, and the album-level switches.
 *
 * Editing is inline and one field at a time — a pencil on the artwork, a
 * pencil beside the title, a chip each for the genre and the start date — so
 * a saved album stops carrying a permanent "create album" form around. Each
 * control calls `updateAlbum` with just its own key; the server leaves the
 * rest alone.
 */
export function AlbumHeader({
  album,
  trackCount,
}: {
  album: AlbumHeaderAlbum;
  trackCount: number;
}) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-start gap-4">
        <CoverEditor album={album} />

        <div className="min-w-0 flex-1 pt-0.5">
          <TitleEditor album={album} />
          <p className="mt-1 text-sm text-muted-foreground">
            {album.genre?.trim() ? `${album.genre.trim()} · ` : ""}
            {trackCount} {trackCount === 1 ? "track" : "tracks"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/tracks">All tracks</Link>
        </Button>
        <SetActiveButton album={album} />
        <GenreControl album={album} />
        <StartDateControl album={album} />
      </div>
    </header>
  );
}

function CoverEditor({ album }: { album: AlbumHeaderAlbum }) {
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState(album.cover_image_url ?? "");
  const [pending, start] = React.useTransition();
  const { toast } = useToast();

  // The dialog is the only place the draft URL lives; reopening it should
  // always start from what is actually saved.
  function openDialog() {
    setUrl(album.cover_image_url ?? "");
    setOpen(true);
  }

  function save() {
    start(async () => {
      try {
        await updateAlbum({ id: album.id, cover_image_url: url });
        setOpen(false);
        toast(url ? "Cover updated" : "Cover removed");
      } catch (e) {
        toast((e as Error).message);
      }
    });
  }

  return (
    <>
      <div className="relative h-20 w-20 shrink-0 md:h-24 md:w-24">
        <div className="relative h-full w-full overflow-hidden rounded-md border border-border bg-gradient-to-br from-primary/20 via-surface-2 to-accent/15">
          {album.cover_image_url ? (
            <CoverArt
              src={album.cover_image_url}
              sizes="(min-width: 768px) 96px, 80px"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground/25">
              <Disc3 className="h-8 w-8" />
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={openDialog}
          aria-label="Edit album cover"
          title="Edit album cover"
          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-surface shadow-sm"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Album cover</DialogTitle>
            <DialogDescription>
              Upload new artwork, or remove the current image.
            </DialogDescription>
          </DialogHeader>
          <CoverImageUpload
            name="cover_image_url"
            pathPrefix={`album/${OWNER_ID}/${album.id}`}
            defaultUrl={album.cover_image_url}
            onChange={setUrl}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TitleEditor({ album }: { album: AlbumHeaderAlbum }) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(album.title ?? "");
  const [pending, start] = React.useTransition();
  const { toast } = useToast();

  function begin() {
    setValue(album.title ?? "");
    setEditing(true);
  }

  function save() {
    if (value.trim() === (album.title ?? "").trim()) {
      setEditing(false);
      return;
    }
    start(async () => {
      try {
        await updateAlbum({ id: album.id, title: value });
        setEditing(false);
        toast("Album renamed");
      } catch (e) {
        toast((e as Error).message);
      }
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          value={value}
          maxLength={120}
          disabled={pending}
          aria-label="Album title"
          placeholder="Untitled album"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-9 text-lg font-semibold"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={save}
          disabled={pending}
          aria-label="Save title"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setEditing(false)}
          disabled={pending}
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
        {album.title?.trim() || "Untitled album"}
      </h1>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={begin}
        aria-label="Edit album title"
        title="Edit album title"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      {album.is_active && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
          <Star className="h-3 w-3" /> Active
        </span>
      )}
    </div>
  );
}

function SetActiveButton({ album }: { album: AlbumHeaderAlbum }) {
  const [pending, start] = React.useTransition();
  const { toast } = useToast();

  if (album.is_active) return null;

  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await setActiveAlbum(album.id);
            toast("Album set active");
          } catch (e) {
            toast((e as Error).message);
          }
        })
      }
    >
      <Star className="h-4 w-4" />
      {pending ? "Setting…" : "Set active"}
    </Button>
  );
}

function GenreControl({ album }: { album: AlbumHeaderAlbum }) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(album.genre ?? "");
  const [pending, start] = React.useTransition();
  const { toast } = useToast();

  function begin() {
    setValue(album.genre ?? "");
    setEditing(true);
  }

  function save(next: string) {
    if (next.trim() === (album.genre ?? "").trim()) {
      setEditing(false);
      return;
    }
    start(async () => {
      try {
        await updateAlbum({ id: album.id, genre: next });
        setEditing(false);
        toast(next.trim() ? "Genre updated" : "Genre cleared");
      } catch (e) {
        toast((e as Error).message);
      }
    });
  }

  if (!editing) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={begin}
        className={album.genre?.trim() ? undefined : "text-muted-foreground"}
      >
        <Music4 className="h-4 w-4" />
        {album.genre?.trim() || "Genre"}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        value={value}
        maxLength={60}
        disabled={pending}
        aria-label="Album genre"
        placeholder="e.g. Dubstep"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save(value);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-8 w-[10rem]"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => save(value)}
        disabled={pending}
        aria-label="Save genre"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setEditing(false)}
        disabled={pending}
        aria-label="Cancel"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function StartDateControl({ album }: { album: AlbumHeaderAlbum }) {
  const [editing, setEditing] = React.useState(false);
  const [pending, start] = React.useTransition();
  const { toast } = useToast();

  const label = album.start_date
    ? format(parseISO(album.start_date), "MMM d, yyyy")
    : "Start date";

  function save(next: string) {
    start(async () => {
      try {
        await updateAlbum({ id: album.id, start_date: next });
        setEditing(false);
        toast(next ? "Start date updated" : "Start date cleared");
      } catch (e) {
        toast((e as Error).message);
      }
    });
  }

  if (!editing) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setEditing(true)}
        className={album.start_date ? undefined : "text-muted-foreground"}
      >
        <CalendarDays className="h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        type="date"
        aria-label="Album start date"
        defaultValue={album.start_date ?? ""}
        disabled={pending}
        // A date input only reports a complete, valid value — an incomplete
        // one reads as "", which we ignore so half-typed dates never save.
        // Clearing goes through the explicit button instead.
        onChange={(e) => {
          if (e.target.value) save(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-8 w-[10rem]"
      />
      {album.start_date && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => save("")}
          disabled={pending}
          aria-label="Clear start date"
          title="Clear start date"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setEditing(false)}
        disabled={pending}
      >
        Done
      </Button>
    </div>
  );
}
