import { NO_ALBUM } from "@/lib/track-filters";
import type { TrackWithDetails } from "@/lib/types";

/**
 * Grouping for the /tracks library view.
 *
 * The library groups by album rather than by status: an album is the unit the
 * user actually ships, so the page reads as "here is each record, and here is
 * everything not spoken for yet". Tracks with no album fall into a single
 * backlog group pinned last.
 *
 * Since /tracks absorbed the albums shelf, these groups are the app's only
 * index of albums, so they carry the record's own facts — cover art, genre,
 * active flag — and an album with no tracks still gets a heading.
 */

/** Heading for tracks that aren't assigned to an album. */
export const BACKLOG_GROUP_LABEL = "Backlog";

/**
 * What grouping needs to know about an album. `listAlbums()` rows satisfy it;
 * so does the smaller stub a track carries in `track.album`, which is why the
 * cover and active flag are optional.
 */
export type AlbumGroupSource = {
  id: string;
  title: string | null;
  genre: string | null;
  cover_image_url?: string | null;
  is_active?: boolean;
};

export type TrackGroup = {
  /** Album id, or `NO_ALBUM` for the backlog group. */
  id: string;
  label: string;
  /** Album-level genre — null for the backlog group, or an album without one. */
  genre: string | null;
  /** Album detail route — null for the backlog group. */
  href: string | null;
  /** Album artwork — null for the backlog group, or an album without a cover. */
  coverImageUrl: string | null;
  /** Whether this is the one album currently set active. */
  isActive: boolean;
  tracks: TrackWithDetails[];
};

function albumGroup(album: AlbumGroupSource): TrackGroup {
  return {
    id: album.id,
    label: album.title?.trim() || "Untitled album",
    // Genre is an album-level fact, so it belongs to the group heading rather
    // than to each track card underneath it.
    genre: album.genre?.trim() || null,
    href: `/albums/${album.id}`,
    coverImageUrl: album.cover_image_url?.trim() || null,
    isActive: album.is_active ?? false,
    tracks: [],
  };
}

function backlogGroup(): TrackGroup {
  return {
    id: NO_ALBUM,
    label: BACKLOG_GROUP_LABEL,
    genre: null,
    href: null,
    coverImageUrl: null,
    isActive: false,
    tracks: [],
  };
}

/**
 * Group tracks by album, backlog last.
 *
 * `albums` is the albums shelf in its own order (active album first, then
 * `sort_order`). It fixes the group order and supplies the record-level facts
 * a track's album stub doesn't carry. Albums missing from it — a stale cache,
 * or a track pointing at an album the caller didn't fetch — sort
 * alphabetically after the ones that are in it, so a group never disappears
 * just because the ordering hint is incomplete.
 *
 * Empty albums are dropped unless `includeEmptyAlbums` is set. The library
 * passes it when no filter is applied, so a newly created album still has a
 * heading to reach it by; under a filter, showing every album that matched
 * nothing would bury the tracks that did.
 */
export function groupTracksByAlbum(
  tracks: TrackWithDetails[],
  albums: AlbumGroupSource[] = [],
  { includeEmptyAlbums = false }: { includeEmptyAlbums?: boolean } = {},
): TrackGroup[] {
  const groups = new Map<string, TrackGroup>();

  // Seeded first so every group prefers the full album row over the stub on a
  // track, and so an album with no tracks still has somewhere to land.
  for (const album of albums) {
    if (!groups.has(album.id)) groups.set(album.id, albumGroup(album));
  }

  for (const track of tracks) {
    const id = track.album?.id ?? NO_ALBUM;
    let group = groups.get(id);
    if (!group) {
      group = track.album ? albumGroup(track.album) : backlogGroup();
      groups.set(id, group);
    }
    group.tracks.push(track);
  }

  const rank = new Map(albums.map((album, index) => [album.id, index]));

  return Array.from(groups.values())
    .filter((group) => group.tracks.length > 0 || includeEmptyAlbums)
    .sort((a, b) => {
      if (a.id === NO_ALBUM) return 1;
      if (b.id === NO_ALBUM) return -1;
      const aRank = rank.get(a.id) ?? Infinity;
      const bRank = rank.get(b.id) ?? Infinity;
      if (aRank !== bRank) return aRank - bRank;
      return a.label.localeCompare(b.label);
    });
}
