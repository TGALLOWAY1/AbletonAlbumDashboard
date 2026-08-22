import { revalidatePath } from "next/cache";

// Track-level mutations must refresh every surface that renders track data:
// both track detail route shapes (desktop + mobile), the focus page, the
// dashboard (which includes the progress section and session history), and
// the track library (whose album shelves show membership and status). See
// CLAUDE.md "Feature parity rule".
export function revalidateTrackSurfaces(
  trackId: string,
  opts?: { albumIds?: (string | null | undefined)[] },
) {
  revalidatePath(`/m/${trackId}`);
  revalidatePath(`/tracks/${trackId}`);
  revalidatePath(`/focus/${trackId}`);
  revalidatePath("/");
  revalidatePath("/tracks");
  // Album detail pages list their member tracks — refresh every album the
  // mutation could have touched (e.g. both the old and new album on a move).
  for (const albumId of new Set(opts?.albumIds ?? [])) {
    if (albumId) revalidatePath(`/albums/${albumId}`);
  }
}

// Album-level mutations must refresh every surface that renders album data:
// the dashboard (active album card), settings (which shows an album card), and
// the track library — which is the album shelf, so its group headings carry
// the album's cover, title, genre and active flag — plus the album's own
// detail page when known. There is no /albums index to refresh: it redirects
// to /tracks.
export function revalidateAlbumSurfaces(albumId?: string | null) {
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/tracks");
  if (albumId) revalidatePath(`/albums/${albumId}`);
}
