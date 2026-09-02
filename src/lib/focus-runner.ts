/**
 * Pure decision logic behind the focus runner's in-place track and
 * session-type pickers.
 *
 * Kept out of `FocusRunner` for the same reason `task-order.ts` and
 * `track-picker.ts` are: the rules for "can this be picked" and "what
 * happens when it is" have to be exercised by tests without dragging in
 * React, routing, or the session provider.
 */

export type RequiresTrackType = { requires_track: boolean };

/**
 * Whether a session type can be selected given the track (or lack of one)
 * currently attached to the session. A type flagged `requires_track` can
 * only be chosen once a track is attached — it has nothing to log progress
 * against otherwise.
 */
export function canSelectSessionType(
  type: RequiresTrackType,
  trackId: string | null,
): boolean {
  return !type.requires_track || trackId !== null;
}

export type TrackSelectionResult =
  | { allowed: true; path: string }
  | { allowed: false; reason: string };

/**
 * What happens when the track picker changes selection.
 *
 * Picking a track always lands on `/focus/[trackId]`; clearing it always
 * lands on `/focus/new` — except when the session's current type requires a
 * track, in which case clearing is refused so a running session can't be
 * left attached to a type it no longer satisfies. Picking *a* track is never
 * refused: it can only make a `requires_track` type more valid, not less.
 */
export function resolveTrackSelection({
  nextTrackId,
  sessionTypeRequiresTrack,
  sessionTypeName,
}: {
  nextTrackId: string | null;
  sessionTypeRequiresTrack: boolean;
  sessionTypeName?: string | null;
}): TrackSelectionResult {
  if (nextTrackId === null && sessionTypeRequiresTrack) {
    return {
      allowed: false,
      reason: `${sessionTypeName ?? "This session type"} requires a track — pick "No specific track" on the session type first.`,
    };
  }
  return {
    allowed: true,
    path: nextTrackId ? `/focus/${nextTrackId}` : "/focus/new",
  };
}

/**
 * Whether the session goal should be re-seeded from the (new) track's top
 * open task.
 *
 * The goal is seeded once per track: `goalTrackId` records which track the
 * current goal text was last synced to. It re-seeds when the attached track
 * changes and the user has not typed their own goal in the meantime —
 * `goalEdited` is sticky for the rest of the session once set, so a track
 * switch never clobbers a goal the user wrote on purpose.
 */
export function shouldReseedGoal({
  trackId,
  goalTrackId,
  goalEdited,
}: {
  trackId: string | null;
  goalTrackId: string | null;
  goalEdited: boolean;
}): boolean {
  if (goalEdited) return false;
  return trackId !== goalTrackId;
}
