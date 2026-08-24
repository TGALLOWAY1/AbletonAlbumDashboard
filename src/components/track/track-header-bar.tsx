import Link from "next/link";
import { Disc3, MoreHorizontal, Pencil, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/back-link";
import { CoverArt } from "@/components/cover-art";
import { CopyPathButton } from "@/components/copy-path-button";
import { SunoStatusToggle } from "@/components/suno-status-toggle";
import { TrackAlbumSelect } from "@/components/track-album-select";
import { ManualSessionEntry } from "@/components/manual-session-dialog";
import { PinTrackButton } from "@/components/track/pin-track-button";
import { TrackStageStrip } from "@/components/track/track-stage-strip";
import {
  isPinnableStatus,
  isTrackPinned,
  trackSunoStatus,
  type AlbumRow,
  type TrackWithDetails,
} from "@/lib/types";
import type { SessionTypeRow } from "@/lib/types";

/**
 * Everything about a track that is chrome rather than work: who it is, where
 * it stands, and the one button you came to press.
 *
 * Both track surfaces mount this, so identity costs a fixed strip of header
 * instead of a tall masthead plus a separate stages section. `variant` only
 * changes sizing and how much metadata survives the width — never behavior.
 */
export function TrackHeaderBar({
  track,
  albums,
  sessionTypes,
  variant = "desktop",
}: {
  track: TrackWithDetails;
  albums: AlbumRow[];
  sessionTypes: SessionTypeRow[];
  variant?: "desktop" | "mobile";
}) {
  const mobile = variant === "mobile";
  const genre = track.album?.genre?.trim() || null;
  const sunoStatus = trackSunoStatus(track);
  const pinned = isTrackPinned(track);
  // Completed and archived tracks cannot be pinned (`setTrackPinned` rejects
  // them), so the control is not offered rather than shown and refused.
  const canPin = isPinnableStatus(track.status);
  const meta = [
    track.song_key ? track.song_key : null,
    track.bpm ? `${track.bpm} BPM` : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className={
        mobile
          ? "flex flex-col gap-3 border-b border-border bg-surface px-4 py-3"
          : "flex flex-col gap-3 border-b border-border bg-surface px-5 py-3"
      }
    >
      <div className="flex items-center gap-3 md:gap-4">
        <BackLink
          fallback={mobile ? "/" : "/tracks"}
          label="Back"
          variant="icon"
          className="-ml-2 shrink-0"
        />

        {track.cover_image_url ? (
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md">
            <CoverArt src={track.cover_image_url} sizes="44px" />
          </div>
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface-2 text-xs font-bold text-foreground/30">
            {track.name.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base font-semibold leading-tight tracking-tight md:text-[17px]">
              {track.name}
            </h1>
            {genre && !mobile && (
              <Badge variant="primary" title="Album genre">
                {genre}
              </Badge>
            )}
            <SunoStatusToggle trackId={track.id} status={sunoStatus} />
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {meta.length > 0 && (
              <span className="font-medium tabular-nums">
                {meta.join(" · ")}
              </span>
            )}
            {track.album && (
              <>
                <span aria-hidden>·</span>
                <Link
                  href={`/albums/${track.album.id}`}
                  className="inline-flex min-w-0 items-center gap-1 hover:text-foreground"
                >
                  <Disc3 className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {track.album.title?.trim() || "Untitled album"}
                  </span>
                </Link>
              </>
            )}
            {!mobile && (
              <TrackAlbumSelect
                trackId={track.id}
                albumId={track.album?.id ?? null}
                albums={albums}
                variant="compact"
              />
            )}
            {!mobile && track.tags.length > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{track.tags.join(", ")}</span>
              </>
            )}
            {!mobile && track.als_file_path && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate font-mono text-[11px]">
                  {track.als_file_path}
                </span>
                <CopyPathButton path={track.als_file_path} size="sm" />
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!mobile && (
            <>
              {canPin && (
                <PinTrackButton
                  trackId={track.id}
                  trackName={track.name}
                  pinned={pinned}
                />
              )}
              <ManualSessionEntry
                trackId={track.id}
                tracks={[]}
                sessionTypes={sessionTypes}
                variant="desktop"
              />
            </>
          )}
          <Button asChild size={mobile ? "icon" : "md"}>
            <Link href={`/focus/${track.id}`} aria-label="Start focus session">
              <Play className="h-4 w-4" />
              {!mobile && "Start focus session"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon">
            <Link
              href={`/tracks/${track.id}/edit`}
              aria-label="Edit track metadata"
            >
              {mobile ? (
                <MoreHorizontal className="h-4 w-4" />
              ) : (
                <Pencil className="h-4 w-4" />
              )}
            </Link>
          </Button>
        </div>
      </div>

      <TrackStageStrip
        trackId={track.id}
        stages={track.stages}
        variant={variant}
      />

      {mobile && (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <TrackAlbumSelect
              trackId={track.id}
              albumId={track.album?.id ?? null}
              albums={albums}
              variant="compact"
            />
          </div>
          {canPin && (
            <PinTrackButton
              trackId={track.id}
              trackName={track.name}
              pinned={pinned}
              variant="mobile"
            />
          )}
          <ManualSessionEntry
            trackId={track.id}
            tracks={[]}
            sessionTypes={sessionTypes}
            variant="mobile"
          />
        </div>
      )}

    </div>
  );
}
