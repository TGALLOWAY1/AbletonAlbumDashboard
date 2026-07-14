import { revalidatePath } from "next/cache";

// Track-level mutations must refresh every surface that renders track data:
// both track detail route shapes (desktop + mobile), the focus page, the
// dashboard, the progress page (/analytics, which includes session history),
// and the track/album listings (which show membership and status). See
// CLAUDE.md "Feature parity rule".
export function revalidateTrackSurfaces(
  trackId: string,
  opts?: { albumIds?: (string | null | undefined)[] },
) {
  revalidatePath(`/m/${trackId}`);
  revalidatePath(`/tracks/${trackId}`);
  revalidatePath(`/focus/${trackId}`);
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/analytics");
  revalidatePath("/tracks");
  revalidatePath("/albums");
  // Album detail pages list their member tracks — refresh every album the
  // mutation could have touched (e.g. both the old and new album on a move).
  for (const albumId of new Set(opts?.albumIds ?? [])) {
    if (albumId) revalidatePath(`/albums/${albumId}`);
  }
}

// Album-level mutations must refresh every surface that renders album data:
// the dashboard (focus album card), the album listing, and settings (which
// shows an album card), plus the album's own detail page when known.
export function revalidateAlbumSurfaces(albumId?: string | null) {
  revalidatePath("/");
  revalidatePath("/albums");
  revalidatePath("/settings");
  if (albumId) revalidatePath(`/albums/${albumId}`);
}
