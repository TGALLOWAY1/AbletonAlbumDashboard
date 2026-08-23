import Link from "next/link";
import { format } from "date-fns";
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  Pencil,
  Play,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { AddNoteDialog } from "@/components/add-note-dialog";
import { TrackFinishingSteps } from "@/components/track-finishing-steps";
import {
  MetaRow,
  TaskBar,
  TrackCover,
  type SessionStats,
} from "@/components/track-card-parts";
import { progressFromStages, type TrackWithDetails } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The large mobile track card — one track, everything you need to decide
 * whether to open it, in a block you can read at a glance.
 *
 * Read top to bottom: who it is (art, name, how far along), how much has gone
 * into it, how the task list stands, the three finishing steps you can tick
 * from here, then the one thing to do next. It closes with five equal actions.
 *
 * Deliberately no chips or badges: at this size a row of pills competed with
 * the title for attention and said less than the plain lines underneath. The
 * Suno marker keeps its chip on the desktop card and its full control on both
 * track detail surfaces.
 *
 * Everything except the finishing checklist renders on the server; the
 * checklist and the note dialog are the only client islands.
 */
export function MobileTrackCard({
  track,
  sessionStats,
  stale = false,
  className,
}: {
  track: TrackWithDetails;
  sessionStats?: SessionStats;
  // Computed by the (server) caller — render must stay pure, no Date.now().
  stale?: boolean;
  className?: string;
}) {
  const progress = progressFromStages(track.stages);
  const lastWorked = track.last_worked_at
    ? format(new Date(track.last_worked_at), "MMM d, yyyy")
    : "Never";
  const totalTasks = track.openTaskCount + track.completedTaskCount;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex flex-col gap-3.5 p-4">
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

          <Link href={`/tracks/${track.id}`} className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-[22px] font-bold leading-[1.15] tracking-tight line-clamp-3">
              {track.name}
            </h3>
          </Link>

          <ProgressRing
            value={progress}
            size={60}
            stroke={6}
            labelClassName="text-sm font-bold"
          />
        </div>

        <MetaRow
          size="md"
          stats={sessionStats}
          lastWorked={lastWorked}
          stale={stale}
          estMinutes={track.estMinutesRemaining}
        />

        <TaskBar size="md" completed={track.completedTaskCount} total={totalTasks} />

        <TrackFinishingSteps
          trackId={track.id}
          steps={track.finishingSteps}
          className="border-y border-border"
        />

        {track.nextTask && (
          <p className="line-clamp-2 border-t border-border pt-3.5 text-[15px] leading-snug text-muted-foreground">
            <span className="font-bold text-foreground">Next:</span>{" "}
            {track.nextTask.description}
          </p>
        )}
      </div>

      <MobileTrackCardActions track={track} />
    </Card>
  );
}

/**
 * Five equal actions, in the order you reach for them: start working, check
 * the list, jot something down, look back, fix the details.
 *
 * Notes opens the quick-note dialog rather than navigating — capturing a
 * thought from the card is the whole point of it being here. Tasks and History
 * deep-link into the track's own surfaces; the fragment survives the
 * desktop↔mobile redirect, and the `tab` param picks the right desktop tab.
 */
function MobileTrackCardActions({ track }: { track: TrackWithDetails }) {
  const cell =
    "flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[13px] font-medium";

  return (
    <div className="flex items-stretch divide-x divide-border border-t border-border">
      <Link
        href={`/focus/${track.id}`}
        className={cn(cell, "text-primary")}
        aria-label={`Start a focus session on ${track.name}`}
      >
        <Play className="h-5 w-5" />
        <span>Focus</span>
      </Link>

      <Link
        href={`/tracks/${track.id}#tasks`}
        className={cn(cell, "text-foreground")}
        aria-label={
          track.openTaskCount > 0
            ? `Tasks — ${track.openTaskCount} open`
            : "Tasks"
        }
      >
        <CheckCircle2 className="h-5 w-5" />
        <span>Tasks</span>
      </Link>

      <AddNoteDialog
        trackId={track.id}
        trackName={track.name}
        currentNotes={track.notes}
      >
        <button type="button" className={cn(cell, "text-foreground")}>
          <MessageSquare className="h-5 w-5" />
          <span>Notes</span>
        </button>
      </AddNoteDialog>

      <Link
        href={`/tracks/${track.id}?tab=history#history`}
        className={cn(cell, "text-foreground")}
      >
        <Clock className="h-5 w-5" />
        <span>History</span>
      </Link>

      <Link
        href={`/tracks/${track.id}/edit`}
        className={cn(cell, "text-foreground")}
      >
        <Pencil className="h-5 w-5" />
        <span>Edit</span>
      </Link>
    </div>
  );
}
