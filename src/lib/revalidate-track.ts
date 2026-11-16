import { revalidatePath } from "next/cache";
import { ANALYTICS_PATH } from "@/lib/progress-tab";

// Track-level mutations must refresh every surface that renders track data:
// both track detail route shapes (desktop + mobile), the focus page, the
// dashboard (whose widgets draw tracks, tasks and sessions), the analytics
// page (the heatmap, its figures and the session history), and the track
// library (whose album shelves show membership and status). See CLAUDE.md
// "Feature parity rule".
export function revalidateTrackSurfaces(
  trackId: string,
  opts?: { albumIds?: (string | null | undefined)[] },
) {
  revalidatePath(`/m/${trackId}`);
  revalidatePath(`/tracks/${trackId}`);
  revalidatePath(`/focus/${trackId}`);
  revalidatePath("/");
  revalidatePath(ANALYTICS_PATH);
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

/**
 * Studio tasks (`actions` rows with no track — migration 0028) are drawn on
 * the dashboard, and ticking one moves the tasks-done figure on the analytics
 * page, so they refresh those two. Split out from `revalidateTrackSurfaces`
 * rather than folded into it: that function's whole job is "this track
 * changed, refresh every surface that draws it", and a task with no track has
 * none of those.
 */
export function revalidateGeneralTasks() {
  revalidatePath("/");
  revalidatePath(ANALYTICS_PATH);
}
