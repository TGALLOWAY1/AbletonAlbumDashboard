"use client";

import type { ReactNode } from "react";
import { useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronDown,
  GripVertical,
  Pin,
  PinOff,
  Play,
} from "lucide-react";
import { CoverArt } from "@/components/cover-art";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/toast";
import { reorderPinnedTracks, setTrackPinned } from "@/app/actions/tracks";
import { applyOrder, moveItemTo } from "@/lib/task-order";
import { MAX_PINNED_TRACKS } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The one track's worth of data the collapsed row draws. Deliberately a flat,
 * serializable summary rather than a `TrackWithDetails`: the full card is
 * passed in already-rendered (see `card` below), so the client bundle never
 * needs the track's stages, tasks, Suno experiment or album.
 */
export type PinnedTrackSummary = {
  id: string;
  name: string;
  coverImageUrl: string | null;
  progress: number;
  openTaskCount: number;
  nextTask: string | null;
  lastWorkedLabel: string;
  stale: boolean;
};

export type PinnedTrackItem = {
  id: string;
  summary: PinnedTrackSummary;
  /**
   * The expanded body — the existing `TrackCard`, rendered on the server and
   * handed down as a node. That is what lets this component be a client
   * component (it needs drag state and collapse state) without dragging the
   * whole card, and everything the card imports, into the browser bundle.
   */
  card: ReactNode;
};

/**
 * The shortlist: up to five pinned tracks, in the priority order you set.
 *
 * Collapsed by default. Five expanded track cards was most of a screen before
 * the page said anything else, so the default view is now five scannable rows
 * — position, art, name, how far along, what's next — and the full card is one
 * click away. The rows carry the same drag handle as a task list, and moving
 * one writes an explicit `pin_order` (see `reorderPinnedTracks`); the order is
 * the priority, so the top row is the song you have decided matters most.
 */
export function PinnedTracks({ items }: { items: PinnedTrackItem[] }) {
  const [optimistic, applyOptimistic] = useOptimistic<
    PinnedTrackItem[],
    { kind: "reorder"; ids: string[] } | { kind: "unpin"; id: string }
  >(items, (state, action) =>
    action.kind === "reorder"
      ? applyOrder(state, action.ids)
      : state.filter((item) => item.id !== action.id),
  );
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Same drag model as `TrackTodoList`: the list does not reshuffle under the
  // pointer (that makes hit-testing oscillate) — the dragged row dims and the
  // target draws the edge it will land against.
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  const commitOrder = (ordered: PinnedTrackItem[]) => {
    const ids = ordered.map((item) => item.id);
    startTransition(async () => {
      applyOptimistic({ kind: "reorder", ids });
      const { error } = await reorderPinnedTracks({ orderedIds: ids });
      if (error) toast(error);
    });
  };

  const rowIdAtPoint = (clientY: number): string | null => {
    for (const [id, el] of rowRefs.current) {
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) return id;
    }
    return null;
  };

  const endDrag = () => {
    if (dragId && overId && dragId !== overId) {
      commitOrder(moveItemTo(optimistic, dragId, overId));
    }
    setDragId(null);
    setOverId(null);
  };

  const nudge = (id: string, delta: -1 | 1) => {
    const from = optimistic.findIndex((item) => item.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= optimistic.length) return;
    commitOrder(moveItemTo(optimistic, id, optimistic[to].id));
  };

  const unpin = (item: PinnedTrackItem) => {
    startTransition(async () => {
      applyOptimistic({ kind: "unpin", id: item.id });
      const { error } = await setTrackPinned(item.id, false);
      if (error) toast(error);
    });
  };

  const dragIndex = dragId ? optimistic.findIndex((i) => i.id === dragId) : -1;
  const overIndex = overId ? optimistic.findIndex((i) => i.id === overId) : -1;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pinned · {optimistic.length} of {MAX_PINNED_TRACKS}
        </h2>
        {optimistic.length > 1 && (
          <p className="text-xs text-muted-foreground">
            Drag to set priority — the top track is what matters most right now.
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {optimistic.map((item, index) => (
          <PinnedRow
            key={item.id}
            item={item}
            position={index + 1}
            total={optimistic.length}
            expanded={expanded.has(item.id)}
            dragging={dragId === item.id}
            dropEdge={
              dragId && overId === item.id && dragId !== item.id
                ? dragIndex < overIndex
                  ? "bottom"
                  : "top"
                : null
            }
            registerRef={(el) => {
              if (el) rowRefs.current.set(item.id, el);
              else rowRefs.current.delete(item.id);
            }}
            onDragStart={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragId(item.id);
              setOverId(item.id);
            }}
            onDragMove={(e) => {
              if (!dragId) return;
              const id = rowIdAtPoint(e.clientY);
              if (id) setOverId(id);
            }}
            onDragEnd={endDrag}
            onNudge={(delta) => nudge(item.id, delta)}
            onToggleExpanded={() => toggleExpanded(item.id)}
            onUnpin={() => unpin(item)}
          />
        ))}
      </ul>
    </section>
  );
}

function PinnedRow({
  item,
  position,
  total,
  expanded,
  dragging,
  dropEdge,
  registerRef,
  onDragStart,
  onDragMove,
  onDragEnd,
  onNudge,
  onToggleExpanded,
  onUnpin,
}: {
  item: PinnedTrackItem;
  position: number;
  total: number;
  expanded: boolean;
  dragging: boolean;
  dropEdge: "top" | "bottom" | null;
  registerRef: (el: HTMLLIElement | null) => void;
  onDragStart: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onDragMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onNudge: (delta: -1 | 1) => void;
  onToggleExpanded: () => void;
  onUnpin: () => void;
}) {
  const { summary } = item;

  return (
    <li
      ref={registerRef}
      className={cn(
        "rounded-lg",
        dragging && "opacity-40",
        dropEdge === "top" && "border-t-2 border-t-primary",
        dropEdge === "bottom" && "border-b-2 border-b-primary",
      )}
    >
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 p-2.5 sm:gap-3 sm:p-3">
          <button
            type="button"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                onNudge(-1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                onNudge(1);
              }
            }}
            aria-label={`Reorder ${summary.name}, priority ${position} of ${total}. Use the up and down arrow keys to move it.`}
            title="Drag to set priority"
            // `touch-action: none` is what stops the drag from scrolling the
            // page on a phone — without it the browser claims the gesture.
            className="flex h-10 w-6 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-muted-foreground/50 outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </button>

          <span className="w-4 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
            {position}
          </span>

          <Link
            href={`/tracks/${summary.id}`}
            aria-label={`Open ${summary.name}`}
            className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary/20 via-surface-2 to-accent/15 sm:h-12 sm:w-12"
          >
            {summary.coverImageUrl ? (
              <CoverArt
                src={summary.coverImageUrl}
                sizes="(min-width: 640px) 48px, 44px"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-bold text-foreground/30">
                {summary.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 h-1 bg-foreground/15">
              <span
                className="block h-full bg-primary"
                style={{ width: `${Math.max(0, Math.min(100, summary.progress))}%` }}
              />
            </span>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <Link
                href={`/tracks/${summary.id}`}
                className="truncate text-sm font-semibold hover:underline sm:text-[15px]"
              >
                {summary.name}
              </Link>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {summary.progress}%
              </span>
            </div>
            <p
              className={cn(
                "truncate text-xs",
                summary.nextTask ? "text-muted-foreground" : "text-muted-foreground/70",
              )}
            >
              {summary.nextTask ? (
                <>
                  <span className="font-medium text-foreground/80">Next:</span>{" "}
                  {summary.nextTask}
                </>
              ) : (
                "No open tasks — add one to give it a next step"
              )}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
              <span>
                {summary.openTaskCount} open{" "}
                {summary.openTaskCount === 1 ? "task" : "tasks"}
              </span>
              <span aria-hidden>·</span>
              <span className={cn(summary.stale && "text-warning")}>
                {summary.lastWorkedLabel}
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href={`/focus/${summary.id}`}>
                <Play className="h-4 w-4" />
                Focus
              </Link>
            </Button>
            <Button asChild size="icon" className="h-9 w-9 sm:hidden">
              <Link
                href={`/focus/${summary.id}`}
                aria-label={`Start a focus session on ${summary.name}`}
              >
                <Play className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onUnpin}
              aria-label={`Unpin ${summary.name}`}
              title="Unpin — takes it off the shortlist, keeps the track"
            >
              <PinOff className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onToggleExpanded}
              aria-expanded={expanded}
              aria-label={expanded ? `Collapse ${summary.name}` : `Expand ${summary.name}`}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-border p-2.5 sm:p-3">{item.card}</div>
        )}
      </Card>
    </li>
  );
}

/** Empty shortlist — say what a pin is for, and offer the two ways to fill it. */
export function PinnedTracksEmpty({ hasTracks }: { hasTracks: boolean }) {
  return (
    <Card>
      <div className="flex flex-col items-start gap-3 p-6 sm:p-8">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/12 text-primary">
          <Pin className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-semibold">Nothing pinned yet</h3>
        <p className="max-w-prose text-sm text-muted-foreground">
          Pin up to {MAX_PINNED_TRACKS} tracks to say what you are working on
          right now, in priority order. Pinning is not a commitment — unpin any
          time, and finishing a track clears its slot for you.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant={hasTracks ? "outline" : "default"}>
            <Link href="/tracks">
              {hasTracks ? "Browse your tracks" : "See the library"}
            </Link>
          </Button>
          <Button asChild variant={hasTracks ? "default" : "outline"}>
            <Link href="/tracks/new">Add a track</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
