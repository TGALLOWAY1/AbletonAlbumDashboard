"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  GripVertical,
  MoreHorizontal,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GRID_COLUMNS,
  byReadingOrder,
  moveItem,
  resizeItem,
  stackOrder,
  stepInStack,
  stepItem,
  tabletSpan,
  type Direction,
} from "@/lib/dashboard/grid";
import {
  canAddWidget,
  setWidgetSize,
  withItems,
  type DashboardLayout,
  type LayoutItem,
} from "@/lib/dashboard/layout";
import {
  WIDGET_SIZES,
  matchingSize,
  widgetBounds,
  widgetDefinition,
} from "@/lib/dashboard/widgets";
import { cn } from "@/lib/utils";

/**
 * The dashboard's grid: draws a layout, and in edit mode lets it be
 * rearranged.
 *
 * It owns no layout state. The layout comes in as a prop and every change
 * goes out through `onChange` as a whole new layout, computed by the pure
 * functions in `src/lib/dashboard/grid.ts`. This component's job is the part
 * that cannot be pure: turning a pointer's travel in pixels into cells, and
 * making the widget follow the pointer while the layout underneath snaps.
 *
 * WHERE WIDGETS GO is CSS (see `.dash-grid` in globals.css): each cell carries
 * its position as custom properties and the stylesheet picks the arrangement
 * from the dashboard's own width. So the same markup is the 12-column grid on
 * a desktop, a flowed six-column grid on a tablet and a single column on a
 * phone, with no measuring and nothing that moves after the page hydrates.
 *
 * EDITING has two shapes, for the same reason:
 *
 *   - On the 12-column grid a widget is dragged by its top bar and resized
 *     from its corner, with Pointer Events — one code path for mouse, pen and
 *     touch, the convention `TrackTodoList` set. The focused grip also takes
 *     the arrow keys: a step moves, Shift plus a step resizes.
 *   - On the narrower arrangements there are no cells to drag between —
 *     widgets flow in an order — so the bar offers up / down buttons instead,
 *     which rearrange that order. (The arrow keys do the same there.)
 *
 * Which shape applies is read from the grid's computed style at the moment of
 * the gesture, not tracked in state, so it cannot disagree with what the
 * stylesheet is actually drawing.
 *
 * While editing, a widget's contents are `inert`: a card that is being
 * dragged should not also tick a task or start a timer.
 */

type GridMetrics = { colStep: number; rowStep: number };

/** A drag or resize in flight. Lives in a ref — it changes on every pointer event. */
type Gesture = {
  kind: "move" | "resize";
  id: string;
  pointerId: number;
  /** The layout when the gesture began; every frame is computed from this. */
  startItems: LayoutItem[];
  origin: LayoutItem;
  startX: number;
  startY: number;
  startScrollY: number;
  lastX: number;
  lastY: number;
  metrics: GridMetrics;
  /** False until the pointer has travelled far enough to count as a drag. */
  active: boolean;
  /** The last cell target applied, so identical frames do not re-render. */
  applied: string;
};

/** What the dragged widget needs to draw itself under the pointer. */
type DragView = {
  id: string;
  kind: "move" | "resize";
  dx: number;
  dy: number;
  origin: { x: number; y: number };
  metrics: GridMetrics;
};

const DRAG_THRESHOLD_PX = 4;
/** How close to the top or bottom of the viewport a held widget starts scrolling the page. */
const AUTOSCROLL_EDGE_PX = 56;
/** Pixels per frame at the very edge; it eases in from zero across the zone. */
const AUTOSCROLL_MAX_STEP_PX = 10;
/** How far past the last row the page may scroll while a widget is carried. */
const AUTOSCROLL_SLACK_PX = 120;

const ORDINALS = ["th", "st", "nd", "rd"];
function ordinal(n: number): string {
  const v = n % 100;
  return `${n}${ORDINALS[(v - 20) % 10] ?? ORDINALS[v] ?? ORDINALS[0]}`;
}

/**
 * Column and row pitch in pixels, or null when the 12-column grid is not what
 * is on screen (the tablet and phone arrangements are not dragged).
 */
function readMetrics(grid: HTMLElement): GridMetrics | null {
  const style = getComputedStyle(grid);
  if (style.display !== "grid") return null;
  const columns = style.gridTemplateColumns.split(" ").filter(Boolean);
  if (columns.length !== GRID_COLUMNS) return null;
  const column = parseFloat(columns[0]);
  const row = parseFloat(style.gridAutoRows);
  if (!Number.isFinite(column) || !Number.isFinite(row)) return null;
  const columnGap = parseFloat(style.columnGap) || 0;
  const rowGap = parseFloat(style.rowGap) || 0;
  return { colStep: column + columnGap, rowStep: row + rowGap };
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function DashboardGrid({
  layout,
  editing,
  renderWidget,
  onChange,
  onAnnounce,
  onConfigure,
  onDuplicate,
  onRemove,
  highlightId,
}: {
  layout: DashboardLayout;
  editing: boolean;
  /** The already-rendered body for an instance (a server node, or a preview). */
  renderWidget: (item: LayoutItem) => ReactNode;
  onChange: (next: DashboardLayout) => void;
  /** Spoken to screen readers: where a widget went, or that it could not go. */
  onAnnounce: (message: string) => void;
  onConfigure: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  /** An instance to scroll to and ring — the one that was just added. */
  highlightId: string | null;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const [drag, setDrag] = useState<DragView | null>(null);

  // The gesture handlers outlive the render that created them (a drag spans
  // many), so they read the current layout and callbacks through a ref.
  const latest = useRef({ layout, onChange, onAnnounce });
  useLayoutEffect(() => {
    latest.current = { layout, onChange, onAnnounce };
  });

  const order = stackOrder(layout.items, layout.order ?? undefined);
  const position = new Map(order.map((id, index) => [id, index]));

  // DOCUMENT ORDER FOLLOWS WHAT IS ON SCREEN. Where a widget is *drawn* is
  // CSS either way, but the order the elements sit in the document is the
  // order Tab and a screen reader visit them — and the two arrangements read
  // differently. Stacked and flowed, widgets appear in `order`; on the
  // 12-column grid they appear where they were placed, which is reading
  // order of the grid. One fixed document order would be wrong on one of
  // them (the default layout's phone order starts with the shortcuts, while
  // the grid's top-left is the featured track). The server cannot know which
  // arrangement the browser will pick, so it renders stack order and this
  // re-sorts once the grid is known to be live; nothing moves on screen.
  const [onGrid, setOnGrid] = useState(false);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    // Fires once on observe, then whenever the dashboard's width changes —
    // which is the only thing that switches arrangement.
    const observer = new ResizeObserver(() => setOnGrid(readMetrics(grid) !== null));
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  // …except while a pointer gesture is live. Re-sorting the document under a
  // drag would have React move elements around the one holding pointer
  // capture, and a moved element drops its capture. The order is pinned from
  // press to release and catches up afterwards.
  const [pinnedOrder, setPinnedOrder] = useState<string[] | null>(null);

  const wanted = onGrid
    ? [...layout.items].sort(byReadingOrder)
    : [...layout.items].sort(
        (a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0),
      );
  const ordered = pinnedOrder
    ? [
        ...pinnedOrder.flatMap((id) => wanted.find((item) => item.id === id) ?? []),
        ...wanted.filter((item) => !pinnedOrder.includes(item.id)),
      ]
    : wanted;

  // A keyboard move can re-sort the document too, and an element that is
  // moved in the document loses focus. The grip that was just used asks for
  // it back once the move has rendered.
  // The same goes for the up / down buttons of the stacked arrangements.
  const refocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    const selector = refocus.current;
    if (!selector) return;
    refocus.current = null;
    const control = gridRef.current?.querySelector<HTMLElement>(selector);
    if (control && document.activeElement !== control) {
      control.focus({ preventScroll: true });
    }
  });
  const within = (id: string, control: string) =>
    `[data-widget-id="${CSS.escape(id)}"] ${control}`;

  // ---------------------------------------------------------- animation ----
  //
  // When a widget makes room, it slides there instead of jumping (FLIP: note
  // where each cell was, let the layout change, then play each one from its
  // old spot to its new one). Only in edit mode — outside it nothing moves —
  // and never for the widget under the pointer, which is already following it.
  const cellPositions = useRef(new Map<string, { left: number; top: number }>());
  const dragId = drag?.id ?? null;
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const animate = editing && !prefersReducedMotion();
    const next = new Map<string, { left: number; top: number }>();
    for (const el of grid.querySelectorAll<HTMLElement>("[data-widget-id]")) {
      const id = el.dataset.widgetId;
      if (!id) continue;
      const now = { left: el.offsetLeft, top: el.offsetTop };
      next.set(id, now);
      const before = cellPositions.current.get(id);
      if (
        animate &&
        before &&
        id !== dragId &&
        (before.left !== now.left || before.top !== now.top)
      ) {
        el.animate(
          [
            {
              transform: `translate(${before.left - now.left}px, ${before.top - now.top}px)`,
            },
            { transform: "none" },
          ],
          { duration: 170, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
        );
      }
    }
    cellPositions.current = next;
  });

  // ------------------------------------------------------------ gesture ----

  const applyGesture = useCallback((g: Gesture) => {
    const dx = g.lastX - g.startX;
    const dy = g.lastY - g.startY + (window.scrollY - g.startScrollY);
    if (!g.active) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      g.active = true;
    }
    const cols = Math.round(dx / g.metrics.colStep);
    const rows = Math.round(dy / g.metrics.rowStep);
    const key = `${cols}:${rows}`;
    if (key !== g.applied) {
      g.applied = key;
      const items =
        g.kind === "move"
          ? moveItem(g.startItems, g.id, g.origin.x + cols, g.origin.y + rows)
          : resizeItem(
              g.startItems,
              g.id,
              g.origin.w + cols,
              g.origin.h + rows,
              widgetBounds(g.origin.type),
            );
      latest.current.onChange(withItems(latest.current.layout, items));
    }
    setDrag({
      id: g.id,
      kind: g.kind,
      dx,
      dy,
      origin: { x: g.origin.x, y: g.origin.y },
      metrics: g.metrics,
    });
  }, []);

  const beginGesture = (
    kind: Gesture["kind"],
    item: LayoutItem,
    e: ReactPointerEvent<HTMLElement>,
  ) => {
    if (!editing || gesture.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const grid = gridRef.current;
    const metrics = grid ? readMetrics(grid) : null;
    if (!metrics) return;
    // Capture, so moves keep arriving once the pointer leaves the handle.
    e.currentTarget.setPointerCapture(e.pointerId);
    setPinnedOrder(ordered.map((entry) => entry.id));
    gesture.current = {
      kind,
      id: item.id,
      pointerId: e.pointerId,
      startItems: latest.current.layout.items,
      origin: item,
      startX: e.clientX,
      startY: e.clientY,
      startScrollY: window.scrollY,
      lastX: e.clientX,
      lastY: e.clientY,
      metrics,
      active: false,
      applied: "0:0",
    };
  };

  const trackGesture = (e: ReactPointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.pointerId) return;
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    applyGesture(g);
  };

  const describe = useCallback((id: string) => {
    const item = latest.current.layout.items.find((i) => i.id === id);
    if (!item) return "";
    const name = widgetDefinition(item.type).name;
    return `${name}: column ${item.x + 1}, row ${item.y + 1}, ${item.w} wide by ${item.h} tall.`;
  }, []);

  const endGesture = useCallback(
    (revert: boolean) => {
      const g = gesture.current;
      if (!g) return;
      gesture.current = null;
      setPinnedOrder(null);
      if (revert && g.active) {
        latest.current.onChange(withItems(latest.current.layout, g.startItems));
        latest.current.onAnnounce("Cancelled. The widget is back where it was.");
      } else if (g.active) {
        latest.current.onAnnounce(describe(g.id));
      }
      // Let go: the card eases from wherever the pointer left it into its cell.
      const card = gridRef.current?.querySelector<HTMLElement>(
        `[data-widget-id="${CSS.escape(g.id)}"] [data-widget-card]`,
      );
      if (card && g.kind === "move" && g.active && !prefersReducedMotion()) {
        const from = card.style.transform;
        if (from) {
          card.animate([{ transform: from }, { transform: "none" }], {
            duration: 170,
            easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          });
        }
      }
      setDrag(null);
    },
    [describe],
  );

  // While a gesture is live: Escape puts everything back, and holding the
  // widget near the top or bottom edge scrolls the page under it.
  const gestureLive = drag !== null;
  useEffect(() => {
    if (!gestureLive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        endGesture(true);
      }
    };
    window.addEventListener("keydown", onKey);

    // The gesture works in the column and row pitch measured when it began.
    // If the window is resized under it — or the dashboard narrows into
    // another arrangement altogether — those numbers are stale, so the
    // gesture is put back rather than finished on the wrong grid.
    const onResize = () => endGesture(true);
    window.addEventListener("resize", onResize);

    let frame = 0;
    const tick = () => {
      const g = gesture.current;
      if (g?.active) {
        const before = window.scrollY;
        // How far into either edge zone the pointer is: negative at the top,
        // positive at the bottom, zero in between.
        const depth =
          g.lastY < AUTOSCROLL_EDGE_PX
            ? g.lastY - AUTOSCROLL_EDGE_PX
            : Math.max(0, g.lastY - (window.innerHeight - AUTOSCROLL_EDGE_PX));
        if (depth !== 0) {
          const speed = Math.min(1, Math.abs(depth) / AUTOSCROLL_EDGE_PX);
          let step = Math.sign(depth) * Math.ceil(speed * AUTOSCROLL_MAX_STEP_PX);
          if (step > 0) {
            // Downward, stop where the layout stops. The card under the
            // pointer is drawn with a transform, and a transformed element
            // stretches the page's scrollable area to wherever it is — so
            // the page "ends" wherever the widget is held, and an unbounded
            // scroll chases it into blank space for as long as the pointer
            // stays put. The grid's own box is the real end of the content
            // (it grows only when the layout really gains a row); a little
            // slack lets a widget be carried just past the last row.
            const grid = gridRef.current;
            const room = grid
              ? grid.getBoundingClientRect().bottom + AUTOSCROLL_SLACK_PX - window.innerHeight
              : 0;
            step = Math.max(0, Math.min(step, Math.floor(room)));
          }
          if (step !== 0) window.scrollBy(0, step);
        }
        if (window.scrollY !== before) applyGesture(g);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, [gestureLive, endGesture, applyGesture]);

  // Leaving edit mode mid-gesture (Save by keyboard, say) must not strand it.
  useEffect(() => {
    if (!editing && gesture.current) {
      gesture.current = null;
      setDrag(null);
    }
  }, [editing]);

  // ------------------------------------------------------------ keyboard ----

  const onGripKey = (item: LayoutItem, e: ReactKeyboardEvent<HTMLElement>) => {
    const direction = (
      {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      } as Record<string, Direction | undefined>
    )[e.key];
    if (!direction) return;
    e.preventDefault();
    refocus.current = within(item.id, "[data-widget-grip]");
    const grid = gridRef.current;
    const name = widgetDefinition(item.type).name;

    if (!grid || !readMetrics(grid)) {
      // Stacked: the only axis is the order.
      moveInStack(item, direction === "up" || direction === "left" ? -1 : 1);
      return;
    }

    if (e.shiftKey) {
      const w = item.w + (direction === "right" ? 1 : direction === "left" ? -1 : 0);
      const h = item.h + (direction === "down" ? 1 : direction === "up" ? -1 : 0);
      const items = resizeItem(layout.items, item.id, w, h, widgetBounds(item.type));
      const resized = items.find((i) => i.id === item.id);
      if (resized && (resized.w !== item.w || resized.h !== item.h)) {
        onChange(withItems(layout, items));
        onAnnounce(`${name} is now ${resized.w} wide by ${resized.h} tall.`);
      } else {
        onAnnounce(`${name} cannot be made ${w < item.w || h < item.h ? "smaller" : "larger"} that way.`);
      }
      return;
    }

    const items = stepItem(layout.items, item.id, direction);
    if (items === layout.items) {
      onAnnounce(`${name} cannot move further ${direction}.`);
      return;
    }
    onChange(withItems(layout, items));
    const moved = items.find((i) => i.id === item.id);
    if (moved) onAnnounce(`${name} moved to column ${moved.x + 1}, row ${moved.y + 1}.`);
  };

  const moveInStack = (item: LayoutItem, delta: -1 | 1) => {
    const next = stepInStack(order, item.id, delta);
    const name = widgetDefinition(item.type).name;
    if (next === order) {
      onAnnounce(`${name} is already ${delta < 0 ? "first" : "last"}.`);
      return;
    }
    onChange({ ...layout, order: next });
    onAnnounce(`${name} is now ${ordinal(next.indexOf(item.id) + 1)} of ${next.length}.`);
  };

  // --------------------------------------------------------- highlight ----

  useEffect(() => {
    if (!highlightId) return;
    const el = gridRef.current?.querySelector<HTMLElement>(
      `[data-widget-id="${CSS.escape(highlightId)}"]`,
    );
    el?.scrollIntoView({
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    el?.querySelector<HTMLElement>("[data-widget-grip]")?.focus({ preventScroll: true });
  }, [highlightId]);

  return (
    <div
      ref={gridRef}
      className={cn("dash-grid", gestureLive && "select-none")}
      data-editing={editing || undefined}
    >
      {ordered.map((item) => {
        const definition = widgetDefinition(item.type);
        const index = position.get(item.id) ?? 0;
        const active = drag?.id === item.id ? drag : null;
        const moving = active?.kind === "move";

        const cardStyle: CSSProperties | undefined = moving
          ? {
              transform: `translate(${
                active.origin.x * active.metrics.colStep +
                active.dx -
                item.x * active.metrics.colStep
              }px, ${
                active.origin.y * active.metrics.rowStep +
                active.dy -
                item.y * active.metrics.rowStep
              }px)`,
            }
          : undefined;

        return (
          <div
            key={item.id}
            data-widget-id={item.id}
            data-widget-type={item.type}
            className={cn("dash-cell", active && "z-20")}
            style={
              {
                "--x": item.x,
                "--y": item.y,
                "--w": item.w,
                "--h": item.h,
                "--mw": tabletSpan(item.w),
                "--o": index,
              } as CSSProperties
            }
          >
            {/* Where the widget will land. Drawn on the cell, which snaps,
                while the card itself floats under the pointer. */}
            {moving && (
              <div
                aria-hidden
                className="absolute inset-0 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5"
              />
            )}

            <section
              data-widget-card
              aria-label={definition.name}
              style={cardStyle}
              className={cn(
                "dash-widget relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface text-foreground shadow-sm",
                editing && "border-primary/35",
                active && "shadow-xl ring-2 ring-primary/40",
                highlightId === item.id && "ring-2 ring-primary",
              )}
            >
              {editing && (
                <div
                  className="dash-drag z-10 flex h-11 shrink-0 items-center gap-1 border-b border-border bg-surface/95 pl-1 pr-1.5 backdrop-blur"
                  onPointerDown={(e) => {
                    const target = e.target as HTMLElement;
                    // The options menu is portalled to <body>, but React
                    // bubbles its events here as if it were a child. Without
                    // this check a press on a menu item would start a drag,
                    // capture the pointer, and the item would never be chosen.
                    if (!e.currentTarget.contains(target)) return;
                    if (target.closest("[data-no-drag]")) return;
                    beginGesture("move", item, e);
                  }}
                  onPointerMove={trackGesture}
                  onPointerUp={() => endGesture(false)}
                  onPointerCancel={() => endGesture(true)}
                >
                  <button
                    type="button"
                    data-widget-grip
                    onKeyDown={(e) => onGripKey(item, e)}
                    aria-label={`Move ${definition.name}. Arrow keys move it; hold Shift to resize.`}
                    className="flex h-9 w-7 shrink-0 cursor-[inherit] items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <GripVertical className="h-4 w-4" aria-hidden />
                  </button>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {definition.name}
                  </span>

                  <span className="dash-stack-only flex items-center" data-no-drag>
                    <button
                      type="button"
                      data-stack-move="earlier"
                      onClick={() => {
                        refocus.current = within(item.id, '[data-stack-move="earlier"]');
                        moveInStack(item, -1);
                      }}
                      disabled={index === 0}
                      aria-label={`Move ${definition.name} earlier`}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      data-stack-move="later"
                      onClick={() => {
                        refocus.current = within(item.id, '[data-stack-move="later"]');
                        moveInStack(item, 1);
                      }}
                      disabled={index === ordered.length - 1}
                      aria-label={`Move ${definition.name} later`}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden />
                    </button>
                  </span>

                  <span data-no-drag>
                    <WidgetMenu
                      item={item}
                      canDuplicate={canAddWidget(layout, item.type)}
                      onSize={(size) => {
                        onChange(setWidgetSize(layout, item.id, size));
                        onAnnounce(`${definition.name} set to ${WIDGET_SIZES[size].label}.`);
                      }}
                      onConfigure={() => onConfigure(item.id)}
                      onDuplicate={() => onDuplicate(item.id)}
                      onRemove={() => onRemove(item.id)}
                    />
                  </span>
                </div>
              )}

              <div
                inert={editing}
                className={cn(
                  "flex min-h-0 flex-1 flex-col",
                  editing && "pointer-events-none select-none",
                )}
              >
                {renderWidget(item)}
              </div>

              {editing && (
                <div
                  // Pointer-only: the keyboard resizes from the grip (Shift +
                  // arrows), so this is not a second tab stop per widget.
                  aria-hidden
                  title="Drag to resize"
                  className="dash-grid-only absolute bottom-0 right-0 z-10 flex h-7 w-7 cursor-nwse-resize touch-none items-end justify-end p-1 text-muted-foreground hover:text-primary"
                  onPointerDown={(e) => beginGesture("resize", item, e)}
                  onPointerMove={trackGesture}
                  onPointerUp={() => endGesture(false)}
                  onPointerCancel={() => endGesture(true)}
                >
                  <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M11 4 4 11M11 8 8 11" />
                  </svg>
                </div>
              )}
            </section>
          </div>
        );
      })}
    </div>
  );
}

/** The per-widget "more" menu: size presets, settings, duplicate, remove. */
function WidgetMenu({
  item,
  canDuplicate,
  onSize,
  onConfigure,
  onDuplicate,
  onRemove,
}: {
  item: LayoutItem;
  canDuplicate: boolean;
  onSize: (size: keyof typeof WIDGET_SIZES) => void;
  onConfigure: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const definition = widgetDefinition(item.type);
  const current = matchingSize(item.type, item.w, item.h);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${definition.name} options`}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <div className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Size
        </div>
        {definition.sizes.map((size) => (
          <DropdownMenuItem key={size} onSelect={() => onSize(size)}>
            <Check
              className={cn("h-4 w-4", current === size ? "opacity-100" : "opacity-0")}
              aria-hidden
            />
            <span className="flex-1">{WIDGET_SIZES[size].label}</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {WIDGET_SIZES[size].w}×{WIDGET_SIZES[size].h}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {definition.fields.length > 0 && (
          <DropdownMenuItem onSelect={onConfigure}>
            <Settings2 className="h-4 w-4" aria-hidden />
            Settings…
          </DropdownMenuItem>
        )}
        {canDuplicate && (
          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy className="h-4 w-4" aria-hidden />
            Duplicate
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onRemove} className="text-danger">
          <Trash2 className="h-4 w-4" aria-hidden />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
