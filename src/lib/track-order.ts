/**
 * Reorder the visible subset of a track group while leaving filtered-out
 * tracks in their existing slots.
 */
export function mergeVisibleTrackOrder(
  allIds: string[],
  orderedVisibleIds: string[],
): string[] {
  const visibleIds = new Set(orderedVisibleIds);
  let visibleIndex = 0;

  return allIds.map((id) => {
    if (!visibleIds.has(id)) return id;
    const nextId = orderedVisibleIds[visibleIndex];
    visibleIndex += 1;
    return nextId;
  });
}
