import Link from "next/link";
import { format } from "date-fns";
import {
  CheckCircle2,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  Play,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { AddNoteDialog } from "@/components/add-note-dialog";
import { CopyPathButton } from "@/components/copy-path-button";
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
    <Card>
      {/* Mobile layout (<md) */}
      <div className="md:hidden">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-start gap-4">
            <Link
              href={`/tracks/${track.id}`}
              aria-label={`Open ${track.name}`}
              className="h-24 w-24 shrink-0"
            >
              <TrackCover
                track={track}
                className="h-full w-full rounded-2xl"
                textClassName="text-2xl"
              />
            </Link>

            <Link href={`/tracks/${track.id}`} className="min-w-0 flex-1">
              <h3 className="text-xl font-semibold leading-tight line-clamp-2">
                {track.name}
              </h3>
            </Link>

            <ProgressRing value={progress} size={56} stroke={5} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <SunoStatusToggle trackId={track.id} status={sunoStatus} />
              <SunoChip suno={track.sunoExperiment} />
            </div>

            <MetaRow
              stats={sessionStats}
              lastWorked={lastWorked}
              stale={stale}
              estMinutes={track.estMinutesRemaining}
            />

            <TaskBar completed={track.completedTaskCount} total={totalTasks} />

            {track.primaryAction && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Next:</span>{" "}
                {track.primaryAction.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-stretch border-t border-border">
          <Link
            href={`/focus/${track.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 px-2 py-3 text-sm font-medium text-primary"
          >
            <Play className="h-4 w-4" />
            <span>Focus</span>
          </Link>
          <Link
            href={`/tracks/${track.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 border-l border-border px-2 py-3 text-sm font-medium text-foreground"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>
              Tasks
              {track.openTaskCount > 0 ? ` (${track.openTaskCount})` : ""}
            </span>
          </Link>

          <AddNoteDialog
            trackId={track.id}
            trackName={track.name}
            currentNotes={track.notes}
          >
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-1.5 border-l border-border px-2 py-3 text-sm font-medium text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Note</span>
            </button>
          </AddNoteDialog>

          <TrackActionsMenu track={track}>
            <button
              type="button"
              className="flex w-12 shrink-0 items-center justify-center border-l border-border text-muted-foreground"
              aria-label="Track actions"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </TrackActionsMenu>
        </div>
      </div>

      {/* Desktop layout (>=md) */}
      <div className="hidden md:grid md:grid-cols-[88px_minmax(0,2fr)_auto_minmax(0,1.4fr)] md:items-start md:gap-5 md:p-4">
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
      </div>
    </Card>
  );
}
