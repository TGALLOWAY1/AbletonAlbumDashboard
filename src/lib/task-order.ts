/**
 * Ordering rules for a track's task list.
 *
 * The next action on a track is the top of its open task list — an ordering,
 * not a stored flag (migration 0024 removed `actions.is_primary`). That only
 * means something if the order is one you set, so tasks carry a `sort_order`
 * (migration 0025) and these helpers are the single definition of what a move
 * does to the list.
 *
 * Pure and list-shaped rather than index-arithmetic at the call site, so the
 * drag handler and the keyboard handler cannot drift apart: both express a
 * move as "put this row where that row is".
 */

/**
 * Move the item with `fromId` into the slot currently held by `toId`,
 * shifting everything between them by one.
 *
 * Returns the original array (same reference) when the move is a no-op —
 * either id missing, or both the same — so callers can skip a write.
 */
export function moveItemTo<T extends { id: string }>(
  list: T[],
  fromId: string,
  toId: string,
): T[] {
  const from = list.findIndex((item) => item.id === fromId);
  const to = list.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0 || from === to) return list;
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Reapply a known id order to a list of items.
 *
 * Ids the list doesn't contain are dropped; items the id list doesn't mention
 * are kept, in their existing relative order, at the end. That second rule is
 * what stops a row added while a drag was in flight from disappearing out of
 * the optimistic view.
 */
export function applyOrder<T extends { id: string }>(
  list: T[],
  ids: string[],
): T[] {
  const byId = new Map(list.map((item) => [item.id, item]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((item): item is T => item != null);
  const seen = new Set(ids);
  return [...ordered, ...list.filter((item) => !seen.has(item.id))];
}
