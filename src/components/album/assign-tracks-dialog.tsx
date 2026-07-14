"use client";

import * as React from "react";
import { useTransition } from "react";
import { Plus } from "lucide-react";
import { assignTracksToAlbum } from "@/app/actions/tracks";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AlbumOption = { id: string; title: string | null };

export type AssignTrackCandidate = {
  id: string;
  name: string;
  albumId: string | null;
  albumTitle: string | null;
};

function albumLabel(title: string | null | undefined) {
  return title?.trim() || "Untitled album";
}

export function AssignTracksDialog({
  album,
  albums,
  candidates,
  trigger,
}: {
  /** Fixed destination (album detail page). Pass null to show a picker. */
  album: AlbumOption | null;
  /** Destination choices for picker mode (album === null). */
  albums?: AlbumOption[];
  candidates: AssignTrackCandidate[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [destinationId, setDestinationId] = React.useState(album?.id ?? "");
  const [pending, start] = useTransition();
  const { toast } = useToast();

  const destination =
    album ?? (albums ?? []).find((a) => a.id === destinationId) ?? null;

  // In picker mode a track may already live in the chosen destination —
  // hide it rather than offering a no-op move.
  const visible = destination
    ? candidates.filter((c) => c.albumId !== destination.id)
    : candidates;
  const unassigned = visible.filter((c) => c.albumId === null);
  const inOtherAlbums = visible.filter((c) => c.albumId !== null);
  const selectedVisible = visible.filter((c) => selected.has(c.id));
  const count = selectedVisible.length;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSelected(new Set());
      setDestinationId(album?.id ?? "");
    }
  }

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleGroup(group: AssignTrackCandidate[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      group.forEach((c) => {
        if (checked) next.add(c.id);
        else next.delete(c.id);
      });
      return next;
    });
  }

  function handleSubmit() {
    if (!destination || count === 0 || pending) return;
    start(async () => {
      try {
        const { count: added } = await assignTracksToAlbum(
          destination.id,
          selectedVisible.map((c) => c.id),
        );
        toast(
          `Added ${added} ${added === 1 ? "track" : "tracks"} to ${albumLabel(
            destination.title,
          )}`,
        );
        handleOpenChange(false);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  }

  function renderGroup(label: string, group: AssignTrackCandidate[]) {
    if (group.length === 0) return null;
    const allSelected = group.every((c) => selected.has(c.id));
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2 px-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => toggleGroup(group, !allSelected)}
          >
            {allSelected ? "Clear" : "Select all"}
          </button>
        </div>
        {group.map((c) => (
          <label
            key={c.id}
            className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-surface-2"
          >
            <Checkbox
              className="mt-0.5"
              checked={selected.has(c.id)}
              onCheckedChange={(v) => toggle(c.id, v === true)}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {c.name}
              </span>
              {c.albumId && (
                <span className="block text-xs text-muted-foreground">
                  In {albumLabel(c.albumTitle)} ·{" "}
                  <span className="italic">will be moved</span>
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add tracks
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add tracks</DialogTitle>
          <DialogDescription>
            {album
              ? `Move existing tracks into ${albumLabel(album.title)}.`
              : "Choose an album, then pick the tracks to add."}
          </DialogDescription>
        </DialogHeader>

        {!album && (
          <div className="grid gap-2">
            <Label>Album</Label>
            <Select value={destinationId} onValueChange={setDestinationId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an album" />
              </SelectTrigger>
              <SelectContent>
                {(albums ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {albumLabel(a.title)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {visible.length === 0 ? (
          <p className="rounded-md border border-border bg-surface-2 px-3 py-4 text-sm text-muted-foreground">
            {destination
              ? "Every track is already in this album."
              : "No tracks available to add."}
          </p>
        ) : (
          <div className="flex max-h-72 flex-col gap-4 overflow-y-auto pr-1">
            {renderGroup("Unassigned", unassigned)}
            {renderGroup("In other albums", inOtherAlbums)}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending || count === 0 || !destination}
          >
            {pending
              ? "Adding…"
              : `Add ${count} ${count === 1 ? "track" : "tracks"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
