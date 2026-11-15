/**
 * The dashboard's grid, as arithmetic.
 *
 * Every widget is a rectangle on a 12-column grid: `x`/`w` in columns, `y`/`h`
 * in rows. This module is the whole layout engine — collision, compaction,
 * moving, resizing, finding a free slot — and it knows nothing about React,
 * the DOM, widget types or persistence. The grid component turns pointer and
 * key events into calls here and draws whatever comes back, which is what
 * lets every rule below be exercised by a plain unit test (the same split as
 * `task-order.ts` and `heatmap.ts`).
 *
 * Two invariants hold for everything these functions return:
 *
 *   1. **No two rectangles overlap, and none leaves the grid.** Placement is
 *      sequential — each item is dropped into the space left by the ones
 *      before it — so this is true by construction, whatever order the items
 *      arrive in and however broken the input was.
 *   2. **Gravity pulls up.** An item rises until it rests against the top of
 *      the grid or another item, so a layout never has a hole a widget could
 *      fall into. That is what makes a move predictable: neighbours close the
 *      gap you left and open one where you land, and nothing else changes.
 *
 * A drag is always computed from the layout *as it was when the drag began*,
 * not from the previous frame's result. Chaining frames lets rounding and
 * push-order accumulate, so a widget dragged out and back would leave its
 * neighbours somewhere new; from a fixed start, dragging back restores
 * exactly what was there.
 */

export const GRID_COLUMNS = 12;

/** Rows a single widget may span. A ceiling, so a bad save cannot draw a 9000-row card. */
export const MAX_ITEM_ROWS = 12;

export type GridItem = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

/** The smallest and largest a given item may be made. */
export type GridBounds = {
  minW: number;
  minH: number;
  maxW?: number;
  maxH?: number;
};

const FREE_BOUNDS: GridBounds = { minW: 1, minH: 1 };

function int(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Force a rectangle onto the grid: whole numbers, inside the columns, within bounds. */
export function clampItem<T extends GridItem>(
  item: T,
  bounds: GridBounds = FREE_BOUNDS,
  columns: number = GRID_COLUMNS,
): T {
  const maxW = Math.min(bounds.maxW ?? columns, columns);
  const maxH = Math.min(bounds.maxH ?? MAX_ITEM_ROWS, MAX_ITEM_ROWS);
  const w = clamp(int(item.w, bounds.minW), Math.min(bounds.minW, maxW), maxW);
  const h = clamp(int(item.h, bounds.minH), Math.min(bounds.minH, maxH), maxH);
  const x = clamp(int(item.x, 0), 0, columns - w);
  const y = Math.max(0, int(item.y, 0));
  return { ...item, x, y, w, h };
}

export function collides(a: GridItem, b: GridItem): boolean {
  if (a.id === b.id) return false;
  return (
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  );
}

function firstCollision<T extends GridItem>(placed: T[], item: GridItem): T | null {
  for (const other of placed) {
    if (collides(other, item)) return other;
  }
  return null;
}

/** Top-to-bottom, then left-to-right — the order a page is read in. */
export function byReadingOrder(a: GridItem, b: GridItem): number {
  return a.y - b.y || a.x - b.x || a.id.localeCompare(b.id);
}

/**
 * Drop `item` into the space left by `placed`: rise as far as it can, and if
 * where it stands is taken, sink to just below whatever is in the way.
 */
function settle<T extends GridItem>(placed: T[], item: T): T {
  let y = item.y;
  let hit = firstCollision(placed, item);
  if (hit) {
    // Taken: sink past whatever is in the way, as many times as it takes.
    while (hit) {
      y = hit.y + hit.h;
      hit = firstCollision(placed, { ...item, y });
    }
  } else {
    // Free: everything sharing its columns is wholly above or wholly below,
    // so it rises to the lowest bottom edge above it. Computed directly, not
    // stepped a row at a time — a stored `y` can be arbitrarily large.
    y = 0;
    for (const other of placed) {
      const sharesColumns = other.x < item.x + item.w && item.x < other.x + other.w;
      if (sharesColumns && other.y + other.h <= item.y) {
        y = Math.max(y, other.y + other.h);
      }
    }
  }
  return y === item.y ? item : { ...item, y };
}

/** Settle each item in the order given. The order decides who wins a contested cell. */
function settleInOrder<T extends GridItem>(ordered: T[]): T[] {
  const placed: T[] = [];
  for (const item of ordered) placed.push(settle(placed, item));
  return placed;
}

/**
 * Hand results back in the order the caller's array was in. Settling visits
 * items in priority order, but that order is an implementation detail: the
 * array order is what the page renders in, so it must not reshuffle because
 * a widget moved.
 */
function inOrderOf<T extends GridItem>(input: T[], settled: T[]): T[] {
  const byId = new Map(settled.map((item) => [item.id, item]));
  return input.flatMap((item) => byId.get(item.id) ?? []);
}

/**
 * Close every gap: each item rises until something stops it.
 *
 * Also the repair step for a layout that arrived overlapping (a hand-edited
 * save, a widget whose minimum size grew since it was stored): reading order
 * decides who keeps a contested cell and the rest sink below it.
 */
export function compact<T extends GridItem>(items: T[]): T[] {
  return inOrderOf(items, settleInOrder([...items].sort(byReadingOrder)));
}

/**
 * Clamp every item onto the grid and resolve whatever overlaps that leaves.
 * `boundsFor` supplies each item's size limits; omit it for none.
 */
export function normalize<T extends GridItem>(
  items: T[],
  boundsFor?: (item: T) => GridBounds,
  columns: number = GRID_COLUMNS,
): T[] {
  return compact(items.map((item) => clampItem(item, boundsFor?.(item), columns)));
}

/** How far down the layout reaches, in rows. */
export function gridHeight(items: GridItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.y + item.h), 0);
}

export type MovePriority =
  /** A widget the mover lands on yields only if the mover's centre is above its own. */
  | "centre"
  /** Everything the mover lands on yields. */
  | "mover";

/**
 * Move one item so its top-left corner is at (`x`, `y`), and let the rest of
 * the layout make room.
 *
 * Who gives way when the mover lands on another widget is the rule that makes
 * dragging feel right or wrong. With `centre` (the pointer's rule) it is the
 * one sortable lists use: the mover takes a widget's place once its centre has
 * crossed that widget's centre. Before that it is still "above" and the
 * widget stays put; after, the widget rises into the space the mover left.
 * Without it a tall widget could only be passed by dragging clean past its far
 * edge. `mover` is for the keyboard, where one key press is an unambiguous
 * request to go past the neighbour, whatever the two heights are.
 */
export function moveItem<T extends GridItem>(
  items: T[],
  id: string,
  x: number,
  y: number,
  priority: MovePriority = "centre",
  columns: number = GRID_COLUMNS,
): T[] {
  const current = items.find((item) => item.id === id);
  if (!current) return items;
  const mover = clampItem({ ...current, x, y }, { minW: current.w, minH: current.h }, columns);
  const moverCentre = mover.y + mover.h / 2;

  // Each item gets a rank; settling in rank order is what expresses "who
  // yields". The mover ranks at its own row. A widget it lands on ranks just
  // after it (pushed below) or — when it keeps its place — no later than just
  // before it, so the mover sinks beneath instead.
  const ranked = items.map((item) => {
    if (item.id === id) return { item: mover as T, rank: mover.y };
    if (!collides(item, mover)) return { item, rank: item.y };
    // `<=`: dropped squarely onto a widget of its own height, the mover wins.
    const yields =
      priority === "mover" || moverCentre <= item.y + item.h / 2;
    return {
      item,
      rank: yields ? mover.y + 0.5 : Math.min(item.y, mover.y - 0.5),
    };
  });

  ranked.sort(
    (a, b) => a.rank - b.rank || byReadingOrder(a.item, b.item),
  );
  // A second pass in plain reading order closes any gap the push left behind
  // (a widget that sank below the mover and can now rise beside it).
  return inOrderOf(items, compact(settleInOrder(ranked.map((r) => r.item))));
}

/**
 * Resize one item in place. Its corner stays where it is; anything the new
 * rectangle covers moves below it. The resized item always wins — sinking it
 * under a neighbour would pull it out from under the pointer mid-drag.
 */
export function resizeItem<T extends GridItem>(
  items: T[],
  id: string,
  w: number,
  h: number,
  bounds: GridBounds = FREE_BOUNDS,
  columns: number = GRID_COLUMNS,
): T[] {
  const current = items.find((item) => item.id === id);
  if (!current) return items;
  // Width is limited by the columns left to the right of the fixed corner.
  const resized = clampItem(
    { ...current, w: Math.min(int(w, current.w), columns - current.x), h },
    bounds,
    columns,
  );
  // `clampItem` may shift x to fit a minimum width at the right edge; that is
  // the one case where the corner moves, and only as far as it must.
  const ranked = items.map((item) => {
    if (item.id === id) return { item: resized as T, rank: resized.y };
    return {
      item,
      rank: collides(item, resized) ? resized.y + 0.5 : item.y,
    };
  });
  ranked.sort((a, b) => a.rank - b.rank || byReadingOrder(a.item, b.item));
  return inOrderOf(items, compact(settleInOrder(ranked.map((r) => r.item))));
}

/**
 * The first free slot a `w`×`h` rectangle fits in, scanning like text: across
 * each row, then down. A new widget fills a hole at the end of a row before
 * it starts a new one, the way an icon lands on a phone's home screen.
 */
export function findSlot(
  items: GridItem[],
  w: number,
  h: number,
  columns: number = GRID_COLUMNS,
): { x: number; y: number } {
  const width = clamp(int(w, 1), 1, columns);
  const height = Math.max(1, int(h, 1));
  const bottom = gridHeight(items);
  for (let y = 0; y <= bottom; y += 1) {
    for (let x = 0; x <= columns - width; x += 1) {
      const probe = { id: "\u0000probe", x, y, w: width, h: height };
      if (!firstCollision(items, probe)) return { x, y };
    }
  }
  return { x: 0, y: bottom };
}

export function removeItem<T extends GridItem>(items: T[], id: string): T[] {
  return compact(items.filter((item) => item.id !== id));
}

export type Direction = "up" | "down" | "left" | "right";

/**
 * One keyboard step.
 *
 * Left and right are a column. Up and down are *past the neighbour*, not a
 * row: with gravity on, a widget nudged one row down just floats back, so a
 * vertical step has to mean "trade places with what is above / below me".
 * Returns the same array when there is nowhere to go, so the caller can tell
 * a move from a bump against the edge.
 */
export function stepItem<T extends GridItem>(
  items: T[],
  id: string,
  direction: Direction,
  columns: number = GRID_COLUMNS,
): T[] {
  const item = items.find((i) => i.id === id);
  if (!item) return items;

  if (direction === "left" || direction === "right") {
    const x = item.x + (direction === "left" ? -1 : 1);
    if (x < 0 || x + item.w > columns) return items;
    return moveItem(items, id, x, item.y, "centre", columns);
  }

  const sharesColumns = (other: GridItem) =>
    other.id !== id && other.x < item.x + item.w && item.x < other.x + other.w;

  if (direction === "up") {
    const above = items
      .filter((o) => sharesColumns(o) && o.y + o.h <= item.y)
      .sort((a, b) => b.y + b.h - (a.y + a.h))[0];
    if (!above) return items;
    return moveItem(items, id, item.x, above.y, "mover", columns);
  }

  const below = items
    .filter((o) => sharesColumns(o) && o.y >= item.y + item.h)
    .sort((a, b) => a.y - b.y)[0];
  if (!below) return items;
  // Landing on the neighbour's far edge leaves it nothing to collide with:
  // it rises into the space the mover left and the mover settles under it.
  return moveItem(items, id, item.x, below.y + below.h, "mover", columns);
}

/**
 * The single-file order for screens too narrow for the grid.
 *
 * `saved` is the order the user set on a phone or tablet, if any. It is
 * applied forgivingly, the way `orderCategories` applies a saved tab order:
 * ids that no longer exist are dropped, and widgets it does not mention (added
 * later, on a desktop) follow in reading order. With nothing saved the stack
 * is simply the grid read top-to-bottom, left-to-right.
 */
export function stackOrder(items: GridItem[], saved?: readonly string[]): string[] {
  const reading = [...items].sort(byReadingOrder).map((item) => item.id);
  if (!saved || saved.length === 0) return reading;
  const known = new Set(reading);
  const seen = new Set<string>();
  const placed: string[] = [];
  for (const id of saved) {
    if (!known.has(id) || seen.has(id)) continue;
    seen.add(id);
    placed.push(id);
  }
  return [...placed, ...reading.filter((id) => !seen.has(id))];
}

/** Move one id a step earlier (`-1`) or later (`1`) in a stack order. */
export function stepInStack(order: string[], id: string, delta: -1 | 1): string[] {
  const from = order.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= order.length) return order;
  const next = [...order];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/**
 * Columns a widget takes on the six-column tablet grid: half the row or all
 * of it. The tablet grid is not laid out by hand — widgets flow in stack
 * order — so the only thing carried over from the desktop is whether a widget
 * was a narrow one or a wide one.
 */
export function tabletSpan(w: number): 3 | 6 {
  return w <= 4 ? 3 : 6;
}
