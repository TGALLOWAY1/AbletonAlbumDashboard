import type { ReactNode } from "react";
import { format } from "date-fns";
import { MoreVertical } from "lucide-react";
import { CopyPathButton } from "@/components/copy-path-button";
import { SunoStatusToggle } from "@/components/suno-status-toggle";
import { TrackActionsMenu } from "@/components/track-card-parts";
import { Button } from "@/components/ui/button";
import {
  PinnedTracksList,
  type PinnedTrackSummary,
} from "@/components/dashboard/widgets/pinned-tracks-list";
import { WIDGETS } from "@/lib/dashboard/widgets";
import { getPinnedTracksCached, listTrackOptionsCached } from "@/lib/data/dashboard";
import { isTrackStale, progressFromStages, trackSunoStatus } from "@/lib/types";

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

  // What the home page's expanded track card used to carry beyond the facts
  // above: where the track stands with Suno, the Ableton project path, and
  // the track's own actions (status, delete). They sit in each row's opened
  // detail, so none of them stopped being reachable from the dashboard.
  const controls: Record<string, ReactNode> = {};
  for (const track of pinned) {
    controls[track.id] = (
      <>
        <SunoStatusToggle trackId={track.id} status={trackSunoStatus(track)} />
        {/* Desktop only, like everywhere else it appears: a file path on
            this machine means nothing on a phone. */}
        {track.als_file_path && (
          <span className="hidden md:inline-flex">
            <CopyPathButton path={track.als_file_path} size="sm" />
          </span>
        )}
        <TrackActionsMenu track={track}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 dash-stack:h-9 dash-stack:w-9"
            aria-label={`Actions for ${track.name}`}
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
          </Button>
        </TrackActionsMenu>
      </>
    );
  }

  return (
    <PinnedTracksList
      title={WIDGETS["pinned-tracks"].name}
      items={items}
      options={options}
      controls={controls}
    />
  );
}
