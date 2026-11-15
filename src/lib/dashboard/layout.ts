import { z } from "zod";
import {
  GRID_COLUMNS,
  findSlot,
  moveItem,
  normalize,
  removeItem,
  resizeItem,
  type GridItem,
} from "@/lib/dashboard/grid";
import {
  WIDGET_SIZES,
  readWidgetConfig,
  resolveWidgetType,
  widgetBounds,
  widgetDefinition,
  type WidgetSizeKey,
  type WidgetType,
} from "@/lib/dashboard/widgets";

/**
 * A dashboard layout as a document: which widgets, where, and with what
 * settings.
 *
 * This is the shape that is stored (`dashboard_layouts.layout`, migration
 * 0037) and the shape the page renders from. The grid module moves
 * rectangles; this one knows a rectangle is a *widget* — it has a type from
 * the registry, settings that must match that type's schema, and limits on
 * how small it may be.
 *
 * A widget **type** is a kind of thing ("Tasks"). A widget **instance** is one
 * copy of it on a dashboard, with its own id, box and settings — which is what
 * lets two Tasks widgets show two different tracks. Everything here is keyed
 * by instance id.
 *
 * Stored layouts are untrusted input in the ordinary sense: they outlive the
 * code that wrote them. `readLayout` is the one door they come in through,
 * and it never throws — see there for what it repairs.
 */

/**
 * Bumped when the stored shape changes in a way old code would misread. A
 * reader that meets an older version upgrades it step by step through
 * `UPGRADES`; one that meets a *newer* version (a rollback, a stale tab) cannot
 * know what the fields mean and falls back to the default layout rather than
 * guess.
 */
export const LAYOUT_VERSION = 1;

/** A ceiling on widgets per layout — every one is a set of queries on each load. */
export const MAX_WIDGETS = 24;

export type LayoutItem = GridItem & {
  type: WidgetType;
  config: Record<string, unknown>;
};

export type DashboardLayout = {
  version: typeof LAYOUT_VERSION;
  items: LayoutItem[];
  /**
   * Widget order on screens too narrow for the grid, or `null` to follow the
   * grid's reading order. Only set once someone rearranges on a phone or
   * tablet, so a desktop-only user's phone view tracks their desktop layout
   * for free. Applied with `stackOrder`, which tolerates stale and missing ids.
   */
  order: string[] | null;
};

/** One upgrade step: takes the document at version N and returns it at N+1. */
type Upgrade = (doc: Record<string, unknown>) => Record<string, unknown>;

/**
 * Keyed by the version being upgraded *from*. Empty while there is only one
 * version; the next change to the stored shape adds `1: (doc) => …` here and
 * bumps `LAYOUT_VERSION`, and every layout saved before it keeps loading.
 */
const UPGRADES: Record<number, Upgrade> = {};

export function newWidgetId(): string {
  return `w${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function boundsFor(item: LayoutItem) {
  return widgetBounds(item.type);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function emptyLayout(): DashboardLayout {
  return { version: LAYOUT_VERSION, items: [], order: null };
}

/**
 * The layout a new dashboard opens on — the arrangement in the design
 * reference, on the 12-column grid.
 *
 * `order` is set explicitly rather than left to follow the grid, because the
 * best first screen on a phone is not the desktop read top-to-bottom: there,
 * the shortcuts, the shortlist and the task list come first — what the home
 * page has always led with on a phone — and the featured track and the charts
 * follow.
 */
export function defaultLayout(): DashboardLayout {
  const item = (
    id: string,
    type: WidgetType,
    x: number,
    y: number,
    w: number,
    h: number,
  ): LayoutItem => ({
    id,
    type,
    x,
    y,
    w,
    h,
    config: readWidgetConfig(type, undefined),
  });

  return {
    version: LAYOUT_VERSION,
    items: [
      item("current-track", "current-track", 0, 0, 5, 3),
      item("quick-actions", "quick-actions", 5, 0, 3, 3),
      item("work-heatmap", "work-heatmap", 8, 0, 4, 3),
      item("pinned-tracks", "pinned-tracks", 0, 3, 3, 4),
      item("tasks", "tasks", 3, 3, 3, 4),
      item("focus-timer", "focus-timer", 6, 3, 3, 4),
      item("progress-overview", "progress-overview", 9, 3, 3, 4),
      item("recent-sessions", "recent-sessions", 0, 7, 5, 3),
      item("weekly-activity", "weekly-activity", 5, 7, 3, 3),
      item("goals", "goals", 8, 7, 4, 3),
      item("suno-queue", "suno-queue", 0, 10, 6, 2),
    ],
    order: [
      "quick-actions",
      "pinned-tracks",
      "tasks",
      "current-track",
      "focus-timer",
      "work-heatmap",
      "progress-overview",
      "weekly-activity",
      "recent-sessions",
      "goals",
      "suno-queue",
    ],
  };
}

export type ReadLayoutResult = {
  layout: DashboardLayout;
  /**
   * True when the stored value could not be understood at all and the default
   * was substituted. The page says so, so "my layout is gone" has an
   * explanation; nothing is overwritten until the user saves.
   */
  fallback: boolean;
};

/**
 * Turn whatever is stored into a layout that is safe to render.
 *
 * Never throws and never returns something the grid cannot draw. In order:
 *   - not an object, no `items` array, or a version newer than this code
 *     knows → the default layout, flagged as a fallback;
 *   - an older version → upgraded through `UPGRADES`;
 *   - an item whose type no longer exists → dropped (renames resolve through
 *     `WIDGET_TYPE_ALIASES` first); a second copy of a one-only widget → dropped;
 *   - settings that fail the widget's schema → that widget's defaults;
 *   - a missing or duplicate id → a fresh one;
 *   - a box that is off the grid, under the widget's minimum or overlapping
 *     another → clamped and settled by the grid module.
 *
 * So a layout written by any past version of the app, or edited by hand in
 * the database, at worst loses the pieces that no longer mean anything.
 */
export function readLayout(raw: unknown): ReadLayoutResult {
  let doc: unknown = raw;
  if (typeof doc === "string") {
    try {
      doc = JSON.parse(doc);
    } catch {
      return { layout: defaultLayout(), fallback: true };
    }
  }
  if (!isRecord(doc) || !Array.isArray(doc.items)) {
    return { layout: defaultLayout(), fallback: true };
  }

  let version = typeof doc.version === "number" ? doc.version : 1;
  if (!Number.isInteger(version) || version < 1 || version > LAYOUT_VERSION) {
    return { layout: defaultLayout(), fallback: true };
  }
  while (version < LAYOUT_VERSION) {
    const upgrade = UPGRADES[version];
    if (!upgrade) return { layout: defaultLayout(), fallback: true };
    doc = upgrade(doc as Record<string, unknown>);
    version += 1;
  }
  const upgraded = doc as Record<string, unknown>;
  const rawItems = Array.isArray(upgraded.items) ? upgraded.items : [];

  const items: LayoutItem[] = [];
  const ids = new Set<string>();
  const singles = new Set<WidgetType>();
  for (const entry of rawItems) {
    if (items.length >= MAX_WIDGETS) break;
    if (!isRecord(entry)) continue;
    const type = resolveWidgetType(entry.type);
    if (!type) continue;
    if (!widgetDefinition(type).multiple) {
      if (singles.has(type)) continue;
      singles.add(type);
    }
    let id =
      typeof entry.id === "string" && entry.id.length > 0 && entry.id.length <= 64
        ? entry.id
        : newWidgetId();
    while (ids.has(id)) id = newWidgetId();
    ids.add(id);

    const size = WIDGET_SIZES[widgetDefinition(type).defaultSize];
    const num = (value: unknown, fallback: number) =>
      typeof value === "number" && Number.isFinite(value) ? value : fallback;
    items.push({
      id,
      type,
      x: num(entry.x, 0),
      // An item with no row goes to the end rather than fighting for row 0.
      y: num(entry.y, 1_000_000),
      w: num(entry.w, size.w),
      h: num(entry.h, size.h),
      config: readWidgetConfig(type, entry.config),
    });
  }

  const order = Array.isArray(upgraded.order)
    ? upgraded.order.filter(
        (id): id is string => typeof id === "string" && ids.has(id),
      )
    : null;

  return {
    layout: {
      version: LAYOUT_VERSION,
      items: normalize(items, boundsFor),
      order: order && order.length > 0 ? [...new Set(order)] : null,
    },
    fallback: false,
  };
}

/** Whether another copy of `type` may be added. */
export function canAddWidget(layout: DashboardLayout, type: WidgetType): boolean {
  if (layout.items.length >= MAX_WIDGETS) return false;
  if (widgetDefinition(type).multiple) return true;
  return !layout.items.some((item) => item.type === type);
}

export function countOfType(layout: DashboardLayout, type: WidgetType): number {
  return layout.items.filter((item) => item.type === type).length;
}

function withNewItem(layout: DashboardLayout, item: LayoutItem): DashboardLayout {
  return {
    ...layout,
    items: normalize([...layout.items, item], boundsFor),
    // Only an order someone set by hand needs telling about the newcomer;
    // a `null` order follows the grid and picks it up on its own.
    order: layout.order ? [...layout.order, item.id] : null,
  };
}

/**
 * Add a widget at its default size (or `size`) in the first free slot.
 * Returns the layout unchanged, and no id, when the widget cannot be added.
 */
export function addWidget(
  layout: DashboardLayout,
  type: WidgetType,
  size?: WidgetSizeKey,
): { layout: DashboardLayout; id: string | null } {
  if (!canAddWidget(layout, type)) return { layout, id: null };
  const definition = widgetDefinition(type);
  const box = WIDGET_SIZES[size ?? definition.defaultSize];
  const id = newWidgetId();
  const slot = findSlot(layout.items, box.w, box.h);
  return {
    id,
    layout: withNewItem(layout, {
      id,
      type,
      ...slot,
      w: box.w,
      h: box.h,
      config: readWidgetConfig(type, undefined),
    }),
  };
}

/** A second copy of an instance — same size, same settings, next free slot. */
export function duplicateWidget(
  layout: DashboardLayout,
  id: string,
): { layout: DashboardLayout; id: string | null } {
  const source = layout.items.find((item) => item.id === id);
  if (!source || !canAddWidget(layout, source.type)) return { layout, id: null };
  const copyId = newWidgetId();
  const slot = findSlot(layout.items, source.w, source.h);
  return {
    id: copyId,
    layout: withNewItem(layout, {
      ...source,
      id: copyId,
      ...slot,
      config: structuredClone(source.config),
    }),
  };
}

export function removeWidget(layout: DashboardLayout, id: string): DashboardLayout {
  if (!layout.items.some((item) => item.id === id)) return layout;
  const order = layout.order?.filter((other) => other !== id) ?? null;
  return {
    ...layout,
    items: removeItem(layout.items, id),
    order: order && order.length > 0 ? order : null,
  };
}

export function setWidgetConfig(
  layout: DashboardLayout,
  id: string,
  config: unknown,
): DashboardLayout {
  return {
    ...layout,
    items: layout.items.map((item) =>
      item.id === id
        ? { ...item, config: readWidgetConfig(item.type, config) }
        : item,
    ),
  };
}

/**
 * Snap a widget to one of its presets. A preset wider than the columns left
 * to the widget's right slides it left first, so "Wide" on a widget in the
 * last column gives a wide widget rather than one clipped to what fits.
 */
export function setWidgetSize(
  layout: DashboardLayout,
  id: string,
  size: WidgetSizeKey,
): DashboardLayout {
  const item = layout.items.find((i) => i.id === id);
  if (!item) return layout;
  const box = WIDGET_SIZES[size];
  const x = Math.min(item.x, GRID_COLUMNS - box.w);
  const shifted = x === item.x ? layout.items : moveItem(layout.items, id, x, item.y);
  return {
    ...layout,
    items: resizeItem(shifted, id, box.w, box.h, widgetBounds(item.type)),
  };
}

export function withItems(layout: DashboardLayout, items: LayoutItem[]): DashboardLayout {
  return items === layout.items ? layout : { ...layout, items };
}

/** Whether two layouts would be stored identically — the edit mode's "is there anything to save". */
export function sameLayout(a: DashboardLayout, b: DashboardLayout): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ------------------------------------------------------- saved layouts ----

export const BUILT_IN_LAYOUT_NAME = "My Studio";

export const MAX_LAYOUT_NAME_LENGTH = 40;

/** A ceiling on named layouts — the switcher is a menu, not a library. */
export const MAX_LAYOUTS = 12;

export const layoutNameSchema = z
  .string()
  .trim()
  .min(1, "Give the layout a name.")
  .max(MAX_LAYOUT_NAME_LENGTH, `Keep the name to ${MAX_LAYOUT_NAME_LENGTH} characters.`);

/**
 * A named layout. `id` is `null` for the built-in one that stands in until
 * something has been saved — it has no row, so the first save creates it.
 */
export type SavedLayout = {
  id: string | null;
  name: string;
  isDefault: boolean;
  layout: DashboardLayout;
  /** See `ReadLayoutResult.fallback`. */
  fallback: boolean;
};

export function builtInLayout(): SavedLayout {
  return {
    id: null,
    name: BUILT_IN_LAYOUT_NAME,
    isDefault: true,
    layout: defaultLayout(),
    fallback: false,
  };
}

/**
 * Which layout a request shows: the one asked for in the URL if it exists,
 * otherwise the one marked default, otherwise the first, otherwise the
 * built-in. A stale `?layout=` (a deleted layout, an old bookmark) therefore
 * lands on the default instead of an error page.
 */
export function pickActiveLayout(
  saved: SavedLayout[],
  requestedId: string | null | undefined,
): SavedLayout {
  if (saved.length === 0) return builtInLayout();
  return (
    (requestedId ? saved.find((l) => l.id === requestedId) : undefined) ??
    saved.find((l) => l.isDefault) ??
    saved[0]
  );
}

/** Href for a layout: the default is a bare `/`, like every other default in this app's URLs. */
export function layoutHref(layout: Pick<SavedLayout, "id" | "isDefault">): string {
  return layout.id && !layout.isDefault ? `/?layout=${layout.id}` : "/";
}


