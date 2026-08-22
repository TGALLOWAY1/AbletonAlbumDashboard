import { NO_ALBUM } from "@/lib/track-filters";
import type { TrackWithDetails } from "@/lib/types";

/**
 * Grouping for the /tracks library view.
 *
 * The library groups by album rather than by status: an album is the unit the
 * user actually ships, so the page reads as "here is each record, and here is
 * everything not spoken for yet". Tracks with no album fall into a single
 * backlog group pinned last.
 */

/** Heading for tracks that aren't assigned to an album. */
export const BACKLOG_GROUP_LABEL = "Backlog";

export type TrackGroup = {
  /** Album id, or `NO_ALBUM` for the backlog group. */
  id: string;
  label: string;
  /** Album-level genre — null for the backlog group, or an album without one. */
  genre: string | null;
  /** Album detail route — null for the backlog group. */
  href: string | null;
  tracks: TrackWithDetails[];
};

/**
 * Group tracks by album, backlog last.
 *
 * `albumOrder` is the album-id order the albums shelf uses (active album
 * first, then `sort_order`), so the two surfaces list records the same way.
 * Albums missing from it — a stale cache, or a track pointing at an album the
 * caller didn't fetch — sort alphabetically after the ones that are in it, so
 * a group never disappears just because the ordering hint is incomplete.
 * Empty groups are omitted; only albums that actually have tracks show up.
 */
export function groupTracksByAlbum(
  tracks: TrackWithDetails[],
  albumOrder: string[] = [],
): TrackGroup[] {
  const groups = new Map<string, TrackGroup>();

  for (const track of tracks) {
    const id = track.album?.id ?? NO_ALBUM;
    const existing = groups.get(id);
    if (existing) {
      existing.tracks.push(track);
      continue;
    }
    groups.set(id, {
      id,
      label: track.album
        ? (track.album.title?.trim() || "Untitled album")
        : BACKLOG_GROUP_LABEL,
      // Genre is an album-level fact, so it belongs to the group heading
      // rather than to each track card underneath it.
      genre: track.album?.genre?.trim() || null,
      href: track.album ? `/albums/${track.album.id}` : null,
      tracks: [track],
    });
  }

  const rank = new Map(albumOrder.map((id, index) => [id, index]));

  return Array.from(groups.values()).sort((a, b) => {
    if (a.id === NO_ALBUM) return 1;
    if (b.id === NO_ALBUM) return -1;
    const aRank = rank.get(a.id) ?? Infinity;
    const bRank = rank.get(b.id) ?? Infinity;
    if (aRank !== bRank) return aRank - bRank;
    return a.label.localeCompare(b.label);
  });
}
