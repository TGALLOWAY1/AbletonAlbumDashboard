import { format } from "date-fns";
import {
  PinnedTracksList,
  type PinnedTrackSummary,
} from "@/components/dashboard/widgets/pinned-tracks-list";
import { WIDGETS } from "@/lib/dashboard/widgets";
import { getPinnedTracksCached, listTrackOptionsCached } from "@/lib/data/dashboard";
import { isTrackStale, progressFromStages } from "@/lib/types";

/**
 * The pinned shortlist (migration 0027) as a card: up to five tracks in the
 * priority order you drag them into.
 *
 * This file is the read. Everything the list does — reorder, unpin, the "+"
 * dialog, expanding a row — needs state, so it lives in `PinnedTracksList`,
 * and what crosses to it is a flat summary per track rather than a
 * `TrackWithDetails`: the browser never needs a track's stages, tasks or
 * album to draw a row.
 */
// No settings, so no props are read; `WIDGET_RENDERERS` still checks this
// against `WidgetProps<"pinned-tracks">`.
export async function PinnedTracksWidget() {
  const [pinned, options] = await Promise.all([
    getPinnedTracksCached(),
    // Every non-archived track — the "+" dialog's candidates.
    listTrackOptionsCached(),
  ]);

  // Staleness is decided here, once per request: the client list must not
  // read the clock while rendering.
  const nowMs = new Date().getTime();
  const items: PinnedTrackSummary[] = pinned.map((track) => ({
    id: track.id,
    name: track.name,
    coverImageUrl: track.cover_image_url,
    progress: progressFromStages(track.stages),
    openTaskCount: track.openTaskCount,
    nextTask: track.nextTask?.description ?? null,
    lastWorkedLabel: track.last_worked_at
      ? format(new Date(track.last_worked_at), "MMM d")
      : null,
    stale: isTrackStale(track, nowMs),
  }));

  return (
    <PinnedTracksList
      title={WIDGETS["pinned-tracks"].name}
      items={items}
      options={options}
    />
  );
}
