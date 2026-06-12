import Link from "next/link";
import { format } from "date-fns";
import {
  AudioLines,
  CalendarDays,
  CheckCircle2,
  Clock,
  Hourglass,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  Play,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TrackCardActions } from "@/components/track-card-actions";
import { DeleteTrackMenuItem } from "@/components/delete-track-menu-item";
import { AddNoteDialog } from "@/components/add-note-dialog";
import { CopyPathButton } from "@/components/copy-path-button";
import { progressFromStages, type TrackWithDetails } from "@/lib/types";
import { cn, formatDuration, formatMinutes } from "@/lib/utils";

type SessionStats = { seconds: number; count: number };

function MetaStat({
  icon: Icon,
  value,
  emphasis = false,
  warn = false,
}: {
  icon: LucideIcon;
  value: string;
  emphasis?: boolean;
  warn?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5",
        warn
          ? "text-warning"
          : emphasis
            ? "text-foreground"
            : "text-muted-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="font-medium tabular-nums">{value}</span>
    </span>
  );
}

function MetaRow({
  stats,
  lastWorked,
  stale,
  estMinutes,
}: {
  stats: SessionStats;
  lastWorked: string;
  stale: boolean;
  estMinutes: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <MetaStat icon={Clock} value={formatDuration(stats.seconds)} />
      <MetaStat
        icon={AudioLines}
        value={`${stats.count} ${stats.count === 1 ? "session" : "sessions"}`}
      />
      <MetaStat icon={CalendarDays} value={lastWorked} warn={stale} />
      {estMinutes > 0 && (
        <MetaStat
          icon={Hourglass}
          value={`${formatMinutes(estMinutes)} left`}
          emphasis
        />
      )}
    </div>
  );
}

function TaskBar({ completed, total }: { completed: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.round((completed / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
        {completed} of {total}
      </span>
    </div>
  );
}

function NextAction({ description }: { description?: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Next Action
      </div>
      {description ? (
        <p className="mt-1 text-sm font-medium leading-snug line-clamp-2">
          {description}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">No next action set</p>
      )}
    </div>
  );
}

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
  const [genre] = track.tags;
  const stats = sessionStats ?? { seconds: 0, count: 0 };
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
              href={`/m/${track.id}`}
              aria-label={`Open ${track.name}`}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-surface-2 to-accent/15"
            >
              {track.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={track.cover_image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl font-bold text-foreground/30">
                  {track.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </Link>

            <Link href={`/m/${track.id}`} className="min-w-0 flex-1">
              <h3 className="text-xl font-semibold leading-tight line-clamp-2">
                {track.name}
              </h3>
            </Link>

            <ProgressRing value={progress} size={56} stroke={5} />
          </div>

          <div className="flex flex-col gap-2">
            {genre && (
              <Badge variant="primary" className="self-start">
                {genre}
              </Badge>
            )}

            <MetaRow
              stats={stats}
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
            href={`/m/${track.id}`}
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-12 shrink-0 items-center justify-center border-l border-border text-muted-foreground"
                aria-label="Track actions"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/m/${track.id}`}>Open detail</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/tracks/${track.id}/edit`}>Edit metadata</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <TrackCardActions trackId={track.id} status={track.status} />
              <DropdownMenuSeparator />
              <DeleteTrackMenuItem trackId={track.id} trackName={track.name} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Desktop layout (>=md) */}
      <div className="hidden md:grid md:grid-cols-[88px_minmax(0,2fr)_auto_minmax(0,1.4fr)] md:items-start md:gap-5 md:p-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-md bg-gradient-to-br from-primary/20 via-surface-2 to-accent/15">
          {track.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.cover_image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xl font-bold text-foreground/30">
              {track.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <Link
            href={`/tracks/${track.id}`}
            className="text-base font-semibold leading-tight hover:underline"
          >
            {track.name}
          </Link>
          {genre && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="primary">{genre}</Badge>
            </div>
          )}
          {meta.length > 0 && (
            <p className="mt-1.5 text-xs font-medium text-foreground/80 tabular-nums">
              {meta.join(" · ")}
            </p>
          )}
          <div className="mt-2">
            <MetaRow
              stats={stats}
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Track actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/tracks/${track.id}`}>Open detail</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/tracks/${track.id}/edit`}>Edit metadata</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <TrackCardActions trackId={track.id} status={track.status} />
              <DropdownMenuSeparator />
              <DeleteTrackMenuItem trackId={track.id} trackName={track.name} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
