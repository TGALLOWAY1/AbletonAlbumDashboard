/**
 * The list model behind `TrackPicker` — what the dropdown shows for a query,
 * and where the keyboard highlight lands.
 *
 * It lives here rather than in the component for the same reason
 * `task-order.ts` does: the pointer path and the keyboard path have to agree
 * about which row is "current", and the only way to keep them from drifting is
 * to have one implementation with tests over it.
 */

export type PickableTrackLike = { id: string; name: string; status: string };

/** Rows shown before the user types — a peek at the library, not all of it. */
export const TRACK_PICKER_BROWSE_LIMIT = 6;
/** Rows shown for a query. Slightly longer: a search has earned the space. */
export const TRACK_PICKER_SEARCH_LIMIT = 8;

/** Highlight value meaning "nothing is highlighted yet". */
export const NO_HIGHLIGHT = -1;

export function filterTrackOptions<T extends PickableTrackLike>(
  tracks: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return tracks.slice(0, TRACK_PICKER_BROWSE_LIMIT);
  return tracks
    .filter((t) => t.name.toLowerCase().includes(q))
    .slice(0, TRACK_PICKER_SEARCH_LIMIT);
}

/**
 * Where ArrowUp/ArrowDown moves the highlight.
 *
 * Wraps at both ends, and treats `NO_HIGHLIGHT` as "just before the first
 * row", so ArrowDown from an untouched field lands on row 0 and ArrowUp lands
 * on the last one. An empty list has nowhere to go and stays at
 * `NO_HIGHLIGHT`.
 */
export function nextHighlight(
  count: number,
  current: number,
  delta: number,
): number {
  if (count <= 0) return NO_HIGHLIGHT;
  if (current < 0) return delta > 0 ? 0 : count - 1;
  return (((current + delta) % count) + count) % count;
}

/**
 * The highlight after the list changes underneath it.
 *
 * Typing another character shortens the list, and a highlight left pointing
 * past the end would make Enter commit nothing (or, worse, the wrong row once
 * the list grew back). Anything out of range falls back to `NO_HIGHLIGHT`
 * rather than being clamped onto a row the user never moved to.
 */
export function clampHighlight(count: number, current: number): number {
  if (count <= 0) return NO_HIGHLIGHT;
  if (current < 0 || current >= count) return NO_HIGHLIGHT;
  return current;
}
