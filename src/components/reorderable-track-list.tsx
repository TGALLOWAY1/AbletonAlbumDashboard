"use client";

import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpToLine, GripVertical } from "lucide-react";
import { reorderTracks } from "@/app/actions/tracks";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { applyOrder, moveItemTo } from "@/lib/task-order";
import { cn } from "@/lib/utils";
import {
  GALLERY_GRID_CLASSES,
  type ViewLayout,
  type ViewSize,
} from "@/lib/view-mode";

type ReorderableTrack = {
  id: string;
  name: string;
  card: ReactNode;
};

export function ReorderableTrackList({
  tracks,
  layout,
  size,
}: {
  tracks: ReorderableTrack[];
  layout: ViewLayout;
  size: ViewSize;
}) {
  const [optimistic, applyOptimistic] = useOptimistic<
    ReorderableTrack[],
    string[]
  >(tracks, applyOrder);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function moveTrack(trackId: string, targetIndex: number) {
    const sourceIndex = optimistic.findIndex((track) => track.id === trackId);
    if (sourceIndex < 0) return;

    const boundedTarget = Math.max(
      0,
      Math.min(targetIndex, optimistic.length - 1),
    );
    if (sourceIndex === boundedTarget) return;

    const targetId = optimistic[boundedTarget].id;
    const nextTracks = moveItemTo(optimistic, trackId, targetId);

    startTransition(async () => {
      const ids = nextTracks.map((track) => track.id);
      applyOptimistic(ids);
      const { error } = await reorderTracks({ orderedIds: ids });
      if (error) toast(error);
    });
  }

  const showControls = optimistic.length > 1;

  return (
    <div
      className={cn(
        layout === "gallery"
          ? cn("grid gap-3", GALLERY_GRID_CLASSES[size])
          : "flex flex-col",
        layout === "list" && (size === "large" ? "gap-3" : "gap-2"),
      )}
    >
      {optimistic.map((track, index) => (
        <div
          key={track.id}
          onDragOver={(event) => {
            if (!draggingId || draggingId === track.id) return;
            event.preventDefault();
            setDropTargetId(track.id);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setDropTargetId(null);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (draggingId) moveTrack(draggingId, index);
            setDraggingId(null);
            setDropTargetId(null);
          }}
          className={cn(
            "min-w-0 rounded-lg transition-all",
            layout === "list" ? "flex items-stretch gap-2" : "flex flex-col",
            draggingId === track.id && "opacity-50",
            dropTargetId === track.id &&
              "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
        >
          {showControls && (
            <div
              className={cn(
                "flex shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-surface p-1 shadow-sm",
                layout === "list"
                  ? "w-9 flex-col"
                  : "mb-1 h-9 flex-row self-end",
              )}
            >
              <button
                type="button"
                draggable={!isPending}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", track.id);
                  setDraggingId(track.id);
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDropTargetId(null);
                }}
                className="hidden cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground active:cursor-grabbing sm:block"
                aria-label={`Drag ${track.name} to reorder, position ${index + 1} of ${optimistic.length}`}
                title="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveTrack(track.id, 0)}
                disabled={isPending || index === 0}
                aria-label={`Move ${track.name} to top priority`}
                title="Move to top priority"
              >
                <ArrowUpToLine className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveTrack(track.id, index - 1)}
                disabled={isPending || index === 0}
                aria-label={`Move ${track.name} up`}
                title="Move up"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveTrack(track.id, index + 1)}
                disabled={isPending || index === optimistic.length - 1}
                aria-label={`Move ${track.name} down`}
                title="Move down"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="min-w-0 flex-1">
            {track.card}
          </div>
        </div>
      ))}
    </div>
  );
}
