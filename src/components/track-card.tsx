import Link from "next/link";
import { format } from "date-fns";
import { MoreVertical, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { CopyPathButton } from "@/components/copy-path-button";
import { MobileTrackCard } from "@/components/mobile-track-card";
import { SunoStatusToggle } from "@/components/suno-status-toggle";
import {
  MetaRow,
  NextAction,
  SunoChip,
  TaskBar,
  TrackActionsMenu,
  TrackCover,
  type SessionStats,
} from "@/components/track-card-parts";
import {
  progressFromStages,
  trackSunoStatus,
  type TrackWithDetails,
} from "@/lib/types";

export function TrackCard({
  track,
  sessionStats,
  stale = false,
}: {
  track: TrackWithDetails;
  sessionStats?: SessionStats;
  // Computed by the (server) caller — render must stay pure, no Date.now().
  stale?: boolean;
}) {
  const progress = progressFromStages(track.stages);
  const sunoStatus = trackSunoStatus(track);
  const lastWorked = track.last_worked_at
    ? format(new Date(track.last_worked_at), "MMM d, yyyy")
    : "Never";
  const totalTasks = track.openTaskCount + track.completedTaskCount;
  const meta = [
    track.song_key ? track.song_key : null,
    track.bpm ? `${track.bpm} BPM` : null,
  ].filter(Boolean) as string[];

  return (
    <>
      {/* Mobile (<md) — the redesigned card, see `MobileTrackCard`. It brings
          its own <Card> chrome, so the two layouts are siblings rather than
          one card wrapping both. */}
      <MobileTrackCard
        track={track}
        sessionStats={sessionStats}
        stale={stale}
        className="md:hidden"
      />

      {/* Desktop layout (>=md) */}
      <Card className="hidden md:grid md:grid-cols-[88px_minmax(0,2fr)_auto_minmax(0,1.4fr)] md:items-start md:gap-5 md:p-4">
        <TrackCover
          track={track}
          className="h-20 w-20 rounded-md"
          textClassName="text-xl"
        />

        <div className="min-w-0">
          <Link
            href={`/tracks/${track.id}`}
            className="text-base font-semibold leading-tight hover:underline"
          >
            {track.name}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <SunoStatusToggle trackId={track.id} status={sunoStatus} />
            <SunoChip suno={track.sunoExperiment} />
          </div>
          {meta.length > 0 && (
            <p className="mt-1.5 text-xs font-medium text-foreground/80 tabular-nums">
              {meta.join(" · ")}
            </p>
          )}
          <div className="mt-2">
            <MetaRow
              stats={sessionStats}
              lastWorked={lastWorked}
              stale={stale}
              estMinutes={track.estMinutesRemaining}
            />
          </div>
          <div className="mt-2">
            <TaskBar completed={track.completedTaskCount} total={totalTasks} />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Progress
          </span>
          <ProgressRing value={progress} size={68} />
        </div>

        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <NextAction description={track.primaryAction?.description} />
            <div className="mt-2 flex flex-wrap gap-2">
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
      </Card>
    </>
  );
}
