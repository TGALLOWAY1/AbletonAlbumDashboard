import Link from "next/link";
import { format } from "date-fns";
import { MoreVertical, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { CopyPathButton } from "@/components/copy-path-button";
import {
  AlbumChip,
  MetaRow,
  NextAction,
  ProgressStrip,
  SunoChip,
  TaskBar,
  TrackActionsMenu,
  TrackCover,
  type SessionStats,
} from "@/components/track-card-parts";
import { progressFromStages, type TrackWithDetails } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GALLERY_GRID_CLASSES, type ViewSize } from "@/lib/view-mode";

/**
 * Cover-art-first layout at three densities:
 *  - large  — one track across, artwork beside the full working detail.
 *  - medium — four across, artwork with title, progress, and a focus shortcut.
 *  - small  — a wall of snapshots: artwork, name, progress strip.
 */
export function TrackGalleryView({
  tracks,
  size,
  sessionStats,
  staleTrackIds,
}: {
  tracks: TrackWithDetails[];
  size: ViewSize;
  /** Real per-track aggregates; only the large tile surfaces them. */
  sessionStats?: Map<string, SessionStats>;
  /** Computed by the (server) caller — render stays pure, no Date.now(). */
  staleTrackIds?: Set<string>;
}) {
  return (
    <div className={cn("grid gap-3", GALLERY_GRID_CLASSES[size])}>
      {tracks.map((track) =>
        size === "large" ? (
          <LargeTile
            key={track.id}
            track={track}
            stats={sessionStats?.get(track.id)}
            stale={staleTrackIds?.has(track.id) ?? false}
          />
        ) : size === "medium" ? (
          <MediumTile key={track.id} track={track} />
        ) : (
          <SnapshotTile key={track.id} track={track} />
        ),
      )}
    </div>
  );
}

function LargeTile({
  track,
  stats,
  stale,
}: {
  track: TrackWithDetails;
  stats?: SessionStats;
  stale: boolean;
}) {
  const progress = progressFromStages(track.stages);
  const [genre] = track.tags;
  const lastWorked = track.last_worked_at
    ? format(new Date(track.last_worked_at), "MMM d, yyyy")
    : "Never";
  const meta = [
    track.song_key,
    track.bpm ? `${track.bpm} BPM` : null,
  ].filter(Boolean) as string[];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <Link
          href={`/tracks/${track.id}`}
          aria-label={`Open ${track.name}`}
          className="shrink-0 sm:w-64"
        >
          <TrackCover
            track={track}
            className="aspect-square w-full"
            textClassName="text-5xl"
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <Link
                href={`/tracks/${track.id}`}
                className="text-2xl font-semibold leading-tight hover:underline"
              >
                {track.name}
              </Link>
              {(genre || track.album || track.sunoExperiment) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {genre && <Badge variant="primary">{genre}</Badge>}
                  {track.album && <AlbumChip album={track.album} />}
                  <SunoChip suno={track.sunoExperiment} />
                </div>
              )}
              {meta.length > 0 && (
                <p className="mt-1.5 text-xs font-medium text-foreground/80 tabular-nums">
                  {meta.join(" · ")}
                </p>
              )}
            </div>
            <ProgressRing value={progress} size={68} />
            <TrackActionsMenu track={track}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Track actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </TrackActionsMenu>
          </div>

          <MetaRow
            stats={stats}
            lastWorked={lastWorked}
            stale={stale}
            estMinutes={track.estMinutesRemaining}
          />

          <TaskBar
            completed={track.completedTaskCount}
            total={track.openTaskCount + track.completedTaskCount}
          />

          <NextAction description={track.primaryAction?.description} />

          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm">
              <Link href={`/focus/${track.id}`}>
                <Play className="h-4 w-4" />
                Start focus session
              </Link>
            </Button>
            {track.als_file_path && (
              <CopyPathButton path={track.als_file_path} size="sm" />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function MediumTile({ track }: { track: TrackWithDetails }) {
  const progress = progressFromStages(track.stages);
  const [genre] = track.tags;

  return (
    <Card className="flex flex-col overflow-hidden">
      <Link href={`/tracks/${track.id}`} aria-label={`Open ${track.name}`}>
        <TrackCover
          track={track}
          className="aspect-square w-full"
          textClassName="text-3xl"
        >
          <span className="absolute right-2 top-2 rounded-full bg-surface/85 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
            {progress}%
          </span>
          <ProgressStrip value={progress} />
        </TrackCover>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-1">
          <Link href={`/tracks/${track.id}`} className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold leading-tight">
              {track.name}
            </h3>
          </Link>
          <TrackActionsMenu track={track}>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-1 -mt-1 h-7 w-7 shrink-0"
              aria-label="Track actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </TrackActionsMenu>
        </div>

        {(genre || track.sunoExperiment) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {genre && <Badge variant="primary">{genre}</Badge>}
            <SunoChip suno={track.sunoExperiment} />
          </div>
        )}

        {track.primaryAction && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Next:</span>{" "}
            {track.primaryAction.description}
          </p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1">
          <TaskBar
            completed={track.completedTaskCount}
            total={track.openTaskCount + track.completedTaskCount}
            className="min-w-0 flex-1"
          />
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7 shrink-0"
          >
            <Link
              href={`/focus/${track.id}`}
              aria-label={`Focus on ${track.name}`}
            >
              <Play className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SnapshotTile({ track }: { track: TrackWithDetails }) {
  const progress = progressFromStages(track.stages);

  return (
    <Link
      href={`/tracks/${track.id}`}
      title={`${track.name} — ${progress}% complete`}
      className="group flex flex-col gap-1.5"
    >
      <TrackCover
        track={track}
        className="aspect-square w-full rounded-md border border-border transition-colors group-hover:border-primary/50"
        textClassName="text-lg"
      >
        <ProgressStrip value={progress} />
      </TrackCover>
      <span className="truncate text-xs font-medium leading-tight">
        {track.name}
      </span>
    </Link>
  );
}
