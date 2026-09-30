import { isPinnableStatus } from "@/lib/types";

/**
 * What the dashboard's pin dialog lists, and in what order.
 *
 * The dialog replaced a "Pin another track" section that sat under the
 * shortlist and cost most of a phone screen. It lists the shortlist itself as
 * well as everything that could join it, because a dialog that only offered
 * other tracks would be a dead end at the cap: every Pin button disabled, and
 * the unpin controls hidden behind the overlay. With both in one list a swap
 * is two taps in one place.
 */

type PinCandidate = { id: string; name: string; status: string };

/**
 * The dialog's rows: the shortlist as it stood when the dialog opened, in
 * priority order, then every other track that could join it, in the order
 * given (`listTrackOptions` sorts by last worked, most recent first).
 *
 * `pinnedIds` is a snapshot taken on open, not the live list. That is what
 * keeps a row where it is while the dialog is up: a toggle flips the button
 * in place instead of moving the row out from under the pointer, where the
 * next tap would land on its neighbour. The order refreshes on the next open.
 *
 * A pinned track keeps its row whatever its status; an unpinned one is listed
 * only if `setTrackPinned` would accept it, so the dialog never offers a pin
 * the server refuses.
 */
export function orderPinPickerRows<T extends PinCandidate>(
  options: readonly T[],
  pinnedIds: readonly string[],
): T[] {
  const byId = new Map(options.map((t) => [t.id, t]));
  const pinned = new Set(pinnedIds);
  return [
    ...pinnedIds.flatMap((id) => byId.get(id) ?? []),
    ...options.filter((t) => !pinned.has(t.id) && isPinnableStatus(t.status)),
  ];
}

/** Case-insensitive match anywhere in the name; a blank query matches all. */
export function filterPinPickerRows<T extends { name: string }>(
  rows: readonly T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...rows];
  return rows.filter((t) => t.name.toLowerCase().includes(needle));
}
