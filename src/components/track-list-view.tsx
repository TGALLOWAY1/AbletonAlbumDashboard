import Link from "next/link";
import { ChevronRight, MoreVertical, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrackCard } from "@/components/track-card";
import {
  AlbumChip,
  SunoChip,
  TrackActionsMenu,
  TrackCover,
  type SessionStats,
} from "@/components/track-card-parts";
import { progressFromStages, type TrackWithDetails } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ViewSize } from "@/lib/view-mode";

/**
 * Row-per-track layout at three densities:
 *  - large  — the full `TrackCard` (cover, meta, next action, actions).
 *  - medium — one line of identity plus progress and a focus shortcut.
 *  - small  — a scannable index: cover, name, progress, open tasks.
 */
export function TrackListView({
  tracks,
  size,
  sessionStats,
  staleTrackIds,
}: {
  tracks: TrackWithDetails[];
  size: ViewSize;
  /** Real per-track aggregates; only the large row surfaces them. */
  sessionStats?: Map<string, SessionStats>;
  /** Computed by the (server) caller — render stays pure, no Date.now(). */
  staleTrackIds?: Set<string>;
}) {
  if (size === "large") {
    return (
      <div className="flex flex-col gap-3">
        {tracks.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            sessionStats={sessionStats?.get(track.id)}
            stale={staleTrackIds?.has(track.id) ?? false}
          />
        ))}
      </div>
    );
  }

  if (size === "medium") {
    return (
      <div className="flex flex-col gap-2">
        {tracks.map((track) => (
          <MediumRow key={track.id} track={track} />
        ))}
      </div>
    );
  }

  return (
    <Card className="divide-y divide-border overflow-hidden">
      {tracks.map((track) => (
        <CompactRow key={track.id} track={track} />
      ))}
    </Card>
  );
}

function MediumRow({ track }: { track: TrackWithDetails }) {
  const progress = progressFromStages(track.stages);
  const [genre] = track.tags;
  const meta = [
    track.song_key,
    track.bpm ? `${track.bpm} BPM` : null,
    track.openTaskCount > 0
      ? `${track.openTaskCount} open ${track.openTaskCount === 1 ? "task" : "tasks"}`
      : null,
  ].filter(Boolean) as string[];

  return (
    <Card className="flex items-center gap-3 p-3">
      <Link
        href={`/tracks/${track.id}`}
        aria-label={`Open ${track.name}`}
        className="h-12 w-12 shrink-0"
      >
        <TrackCover
          track={track}
          className="h-full w-full rounded-md"
          textClassName="text-sm"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/tracks/${track.id}`}
            className="truncate text-sm font-semibold leading-tight hover:underline"
          >
            {track.name}
          </Link>
          {genre && <Badge variant="primary">{genre}</Badge>}
          {track.album && <AlbumChip album={track.album} />}
          <SunoChip suno={track.sunoExperiment} />
        </div>
        {(meta.length > 0 || track.primaryAction) && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {meta.join(" · ")}
            {meta.length > 0 && track.primaryAction ? " · " : ""}
            {track.primaryAction?.description}
          </p>
        )}
      </div>

      <ProgressMeter value={progress} className="hidden sm:flex" />

      <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
        <Link href={`/focus/${track.id}`} aria-label={`Focus on ${track.name}`}>
          <Play className="h-4 w-4" />
        </Link>
      </Button>

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
    </Card>
  );
}

// Whole row is a single link — no nested interactive elements at this density.
function CompactRow({ track }: { track: TrackWithDetails }) {
  const progress = progressFromStages(track.stages);

  return (
    <Link
      href={`/tracks/${track.id}`}
      className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-2"
    >
      <TrackCover
        track={track}
        className="h-8 w-8 shrink-0 rounded"
        textClassName="text-[10px]"
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {track.name}
      </span>
      {track.openTaskCount > 0 && (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {track.openTaskCount} open
        </span>
      )}
      <ProgressMeter value={progress} className="hidden sm:flex" />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function ProgressMeter({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-medium tabular-nums text-muted-foreground">
        {value}%
      </span>
    </div>
  );
}
