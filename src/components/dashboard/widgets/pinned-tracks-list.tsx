"use client";

import {
  useId,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ChevronDown, GripVertical, Pin, PinOff, Play } from "lucide-react";
import { CoverArt } from "@/components/cover-art";
import { WidgetBody, WidgetEmpty, WidgetHeader } from "@/components/dashboard/widget-parts";
import { PinTrackDialog } from "@/components/home/pin-track-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { reorderPinnedTracks, setTrackPinned } from "@/app/actions/tracks";
import type { TrackOption } from "@/lib/data/tracks";
import { applyOrder, moveItemTo } from "@/lib/task-order";
import { MAX_PINNED_TRACKS } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The one track's worth of data a row draws. Deliberately a flat,
 * serializable summary rather than a `TrackWithDetails`, so the client bundle
 * never needs the track's stages, tasks, Suno experiment or album.
 */
export type PinnedTrackSummary = {
  id: string;
  name: string;
  coverImageUrl: string | null;
  progress: number;
  openTaskCount: number;
  nextTask: string | null;
  /** "Nov 13", or null for a track that has never been worked on. */
  lastWorkedLabel: string | null;
  stale: boolean;
};

/**
 * The shortlist: up to five pinned tracks, in the priority order you set.
 *
 * Rows are compact list rows with dividers, not a card each — the widget is
 * already a card. What a row shows follows the box: narrow, it is the art,
 * the name, the percent and the play button; from 20rem the next task joins
 * the percent; from 28rem the open-task count and an unpin button do too.
 *
 * The chevron opens a short inline detail — the next task in full, the open
 * count, when it was last worked, and Open / Unpin — rather than the full
 * `TrackCard` the old home page expanded to. That card picks its layout from
 * the *viewport* (`md:`), so on a desktop it would draw its four-column
 * layout inside a column a quarter that wide; and everything it adds beyond
 * these lines is one tap away on the track itself.
 *
 * The rows carry the same drag handle as a task list (Pointer Events, arrow
 * keys on the focused handle), and moving one writes an explicit `pin_order`
 * (`reorderPinnedTracks`); the order is the priority, so the top row is the
 * song you have decided matters most — and the one the Current Track widget
 * follows.
 *
 * The header renders for an empty shortlist too. That is deliberate: the
 * dialog lives in the header, so it has to stay mounted when the last pin
 * goes or the first one lands, or it would vanish mid-use.
 */
export function PinnedTracksList({
  title,
  items,
  options,
  controls,
}: {
  title: string;
  items: PinnedTrackSummary[];
  /** Every non-archived track — the dialog's candidates. */
  options: TrackOption[];
  /**
   * Per-track controls for a row's opened detail, by track id — the Suno
   * status toggle, the `.als` path copy and the track actions menu, which the
   * old home page offered on its expanded card. Rendered on the server and
   * passed down as nodes, so this list never has to import them (or the
   * `TrackWithDetails` they read). Kept out of `items` so the optimistic
   * reorder state stays plain data.
   */
  controls?: Record<string, ReactNode>;
}) {
  const [optimistic, applyOptimistic] = useOptimistic<
    PinnedTrackSummary[],
    { kind: "reorder"; ids: string[] } | { kind: "unpin"; id: string }
  >(items, (state, action) =>
    action.kind === "reorder"
      ? applyOrder(state, action.ids)
      : state.filter((item) => item.id !== action.id),
  );
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);

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

  const commitOrder = (ordered: PinnedTrackSummary[]) => {
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

  const unpin = (item: PinnedTrackSummary) => {
    startTransition(async () => {
      applyOptimistic({ kind: "unpin", id: item.id });
      const { error } = await setTrackPinned(item.id, false);
      if (error) toast(error);
    });
  };

  const dragIndex = dragId ? optimistic.findIndex((i) => i.id === dragId) : -1;
  const overIndex = overId ? optimistic.findIndex((i) => i.id === overId) : -1;

  return (
    <>
      <WidgetHeader
        title={title}
        meta={`${optimistic.length} of ${MAX_PINNED_TRACKS}`}
        action={
          <PinTrackDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            options={options}
            pinnedIds={optimistic.map((item) => item.id)}
          />
        }
      />
      {/* A narrower left gutter than other widgets: the grip is the gutter. */}
      <WidgetBody className="pb-2 pl-2 pr-3">
        {optimistic.length === 0 ? (
          <WidgetEmpty
            icon={Pin}
            title="Nothing pinned yet"
            hint={`Pin up to ${MAX_PINNED_TRACKS} tracks you are working on right now, then drag them into priority order.`}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {options.length > 0 && (
                  <Button
                    size="sm"
                    className="dash-stack:h-9"
                    onClick={() => setPickerOpen(true)}
                  >
                    <Pin className="h-3.5 w-3.5" aria-hidden />
                    Pin a track
                  </Button>
                )}
                <Button
                  asChild
                  size="sm"
                  variant={options.length > 0 ? "outline" : "default"}
                  className="dash-stack:h-9"
                >
                  <Link href="/tracks/new">Add a track</Link>
                </Button>
              </div>
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {optimistic.map((item, index) => (
              <PinnedRow
                key={item.id}
                item={item}
                controls={controls?.[item.id]}
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
        )}
      </WidgetBody>
    </>
  );
}

function PinnedRow({
  item,
  controls,
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
  item: PinnedTrackSummary;
  controls?: ReactNode;
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
  const detailId = useId();
  const progress = Math.max(0, Math.min(100, item.progress));
  const openLabel = `${item.openTaskCount} open ${item.openTaskCount === 1 ? "task" : "tasks"}`;

  return (
    <li
      ref={registerRef}
      className={cn(
        dragging && "opacity-40",
        dropEdge === "top" && "border-t-2 border-t-primary",
        dropEdge === "bottom" && "border-b-2 border-b-primary",
      )}
    >
      <div className="flex items-center gap-1.5 py-1.5 @md/widget:gap-2.5">
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
          aria-label={`Reorder ${item.name}, priority ${position} of ${total}. Use the up and down arrow keys to move it.`}
          title="Drag to set priority"
          // `touch-action: none` is what stops the drag from scrolling the
          // page on a phone — without it the browser claims the gesture.
          className="flex h-9 w-5 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-muted-foreground/50 outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing dash-stack:h-10 dash-stack:w-6"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>

        <Link
          href={`/tracks/${item.id}`}
          aria-label={`Open ${item.name}`}
          className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary/20 via-surface-2 to-accent/15 @md/widget:h-10 @md/widget:w-10"
        >
          {item.coverImageUrl ? (
            <CoverArt src={item.coverImageUrl} sizes="40px" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-foreground/30">
              {item.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          {/* Decorative: the figure is printed beside it. */}
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-foreground/15">
            <span className="block h-full bg-primary" style={{ width: `${progress}%` }} />
          </span>
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/tracks/${item.id}`}
            // The name truncates in a narrow card; this is the whole of it.
            title={item.name}
            className="block truncate text-sm font-medium leading-snug hover:underline"
          >
            {item.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            <span className="tabular-nums">{progress}%</span>
            <span className="hidden @xs/widget:inline">
              <span aria-hidden> · </span>
              {item.nextTask ? (
                <>
                  <span className="font-medium text-foreground/80">Next:</span>{" "}
                  {item.nextTask}
                </>
              ) : (
                "No open tasks"
              )}
            </span>
          </p>
        </div>

        {item.openTaskCount > 0 && (
          <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground @md/widget:inline">
            {item.openTaskCount} open
          </span>
        )}

        <Link
          href={`/focus/${item.id}`}
          aria-label={`Start a focus session on ${item.name}`}
          title="Start a focus session"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-medium text-primary-foreground shadow-sm outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 @md/widget:w-auto @md/widget:px-3 dash-stack:h-9 dash-stack:min-w-9"
        >
          <Play className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden @md/widget:inline">Focus</span>
        </Link>

        {/* Only where there is width for it; the detail under the chevron
            carries Unpin at every size, and so does the "+" dialog. */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 shrink-0 @md/widget:inline-flex"
          onClick={onUnpin}
          aria-label={`Unpin ${item.name}`}
          title="Unpin — takes it off the shortlist, keeps the track"
        >
          <PinOff className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-7 shrink-0 dash-stack:h-9 dash-stack:w-9"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls={expanded ? detailId : undefined}
          aria-label={
            expanded ? `Hide details for ${item.name}` : `Show details for ${item.name}`
          }
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
          />
        </Button>
      </div>

      {expanded && (
        <div
          id={detailId}
          className="flex flex-col gap-2 pb-3 pl-[26px] pr-1 text-xs dash-stack:pl-[30px]"
        >
          <p className="wrap-anywhere">
            <span className="font-medium text-foreground/80">Next:</span>{" "}
            {item.nextTask ?? (
              <span className="text-muted-foreground">
                No open tasks — add one to give it a next step.
              </span>
            )}
          </p>
          <p className="tabular-nums text-muted-foreground">
            {openLabel}
            <span aria-hidden> · </span>
            {item.lastWorkedLabel ? (
              <>
                Last worked {item.lastWorkedLabel}
                {item.stale && (
                  <span className="font-medium text-warning"> · going stale</span>
                )}
              </>
            ) : (
              "Never worked"
            )}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button asChild size="sm" variant="outline" className="dash-stack:h-9">
              <Link href={`/tracks/${item.id}`}>Open track</Link>
            </Button>
            {controls}
            <Button
              size="sm"
              variant="ghost"
              className="dash-stack:h-9"
              onClick={onUnpin}
            >
              <PinOff className="h-3.5 w-3.5" aria-hidden />
              Unpin
              <span className="sr-only"> {item.name}</span>
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
