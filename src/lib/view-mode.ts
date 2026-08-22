/**
 * View preferences for the collection pages (`/tracks`, `/albums`).
 *
 * Two independent axes:
 *  - `layout` — gallery (cover-art first) vs. list (row-per-item).
 *  - `size`   — how much of each item to show: large / medium / small.
 *
 * The preference lives in the URL (`?view=gallery&size=small`) rather than in
 * local state so the pages stay server components, the choice survives a
 * reload, and a particular view is linkable. Values that match the page's
 * default are omitted from the query string, so the plain `/tracks` URL never
 * grows params it doesn't need.
 */

export const VIEW_LAYOUTS = ["gallery", "list"] as const;
export type ViewLayout = (typeof VIEW_LAYOUTS)[number];

export const VIEW_SIZES = ["large", "medium", "small"] as const;
export type ViewSize = (typeof VIEW_SIZES)[number];

export type ViewPreference = {
  layout: ViewLayout;
  size: ViewSize;
};

export type ViewSearchParams = {
  view?: string | string[];
  size?: string | string[];
};

/**
 * Tracks default to the list at medium — the library view is a working list,
 * and medium rows fit a whole album shelf on screen without scrolling.
 */
export const DEFAULT_TRACK_VIEW: ViewPreference = {
  layout: "list",
  size: "medium",
};

/** Albums default to the cover grid — artwork is the point of an album shelf. */
export const DEFAULT_ALBUM_VIEW: ViewPreference = {
  layout: "gallery",
  size: "medium",
};

export const VIEW_LAYOUT_LABELS: Record<ViewLayout, string> = {
  gallery: "Gallery",
  list: "List",
};

export const VIEW_SIZE_LABELS: Record<ViewSize, string> = {
  large: "Large",
  medium: "Medium",
  small: "Small",
};

/** Short letter shown in the size segmented control. */
export const VIEW_SIZE_ABBREVIATIONS: Record<ViewSize, string> = {
  large: "L",
  medium: "M",
  small: "S",
};

/**
 * Columns per gallery size: one item across at large, four at medium, and a
 * wall of snapshots at small. Mobile always steps down a tier so tiles stay
 * tappable.
 */
export const GALLERY_GRID_CLASSES: Record<ViewSize, string> = {
  large: "grid-cols-1",
  medium: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  small: "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8",
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function parseViewPreference(
  params: ViewSearchParams,
  fallback: ViewPreference,
): ViewPreference {
  const layout = first(params.view);
  const size = first(params.size);
  return {
    layout: VIEW_LAYOUTS.includes(layout as ViewLayout)
      ? (layout as ViewLayout)
      : fallback.layout,
    size: VIEW_SIZES.includes(size as ViewSize)
      ? (size as ViewSize)
      : fallback.size,
  };
}

/** Query string for a view preference — "" when it matches the page default. */
export function serializeViewPreference(
  preference: ViewPreference,
  fallback: ViewPreference,
): string {
  const usp = new URLSearchParams();
  if (preference.layout !== fallback.layout) usp.set("view", preference.layout);
  if (preference.size !== fallback.size) usp.set("size", preference.size);
  return usp.toString();
}

/**
 * Combine query-string fragments owned by different controls (filters, view
 * preference) so neither drops the other's params when it navigates. A later
 * fragment replaces an earlier one's key outright, repeated keys included.
 */
export function mergeQuery(
  ...parts: Array<string | null | undefined>
): string {
  const merged = new Map<string, string[]>();
  for (const part of parts) {
    if (!part) continue;
    const usp = new URLSearchParams(part);
    for (const key of new Set(usp.keys())) {
      merged.set(key, usp.getAll(key));
    }
  }
  const out = new URLSearchParams();
  for (const [key, values] of merged) {
    for (const value of values) out.append(key, value);
  }
  return out.toString();
}

/** Href for switching to `preference`, keeping any other params intact. */
export function viewHref(
  basePath: string,
  preference: ViewPreference,
  fallback: ViewPreference,
  preserveQuery?: string,
): string {
  const qs = mergeQuery(
    preserveQuery,
    serializeViewPreference(preference, fallback),
  );
  return qs ? `${basePath}?${qs}` : basePath;
}
