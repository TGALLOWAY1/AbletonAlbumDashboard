import Link from "next/link";
import { format } from "date-fns";
import {
  CheckCircle2,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
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
import {
  BOTTLENECK_LABELS,
  progressFromStages,
  type TrackWithDetails,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function TrackCard({
  track,
  recommended = false,
}: {
  track: TrackWithDetails;
  recommended?: boolean;
}) {
  const progress = progressFromStages(track.stages);
  const [genre, ...descriptors] = track.tags;
  const lastWorkedLabel = track.last_worked_at
    ? `Last worked: ${format(new Date(track.last_worked_at), "MMM d, yyyy")}`
    : "Never worked on yet";
  const meta = [
    track.song_key ? track.song_key : null,
    track.bpm ? `${track.bpm} BPM` : null,
  ].filter(Boolean) as string[];

  return (
    <Card className={cn(recommended && "ring-1 ring-primary/40")}>
      {/* Mobile layout (<md) */}
      <div className="md:hidden">
        <Link
          href={`/m/${track.id}`}
          className="flex items-start gap-4 p-4"
          aria-label={`Open ${track.name}`}
        >
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-surface-2 to-accent/15">
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
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 flex-1 text-xl font-semibold leading-tight line-clamp-2">
                {track.name}
              </h3>
              <ProgressRing
                value={progress}
                size={56}
                stroke={5}
                className="shrink-0"
              />
            </div>

            <div className="flex items-center gap-2">
              {genre && <Badge variant="primary">{genre}</Badge>}
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {progress}%
              </span>
            </div>

            {(track.bottleneck || track.primaryAction) && (
              <div className="flex flex-col gap-1 text-sm">
                {track.bottleneck && (
                  <p className="line-clamp-2 text-foreground">
                    <span className="font-semibold text-danger">Blocker:</span>{" "}
                    {track.bottleneck.description}
                  </p>
                )}
                {track.primaryAction && (
                  <p className="line-clamp-2 text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Next:
                    </span>{" "}
                    {track.primaryAction.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </Link>

        <div className="flex items-stretch border-t border-border">
          <Link
            href={`/m/${track.id}`}
            className="flex flex-1 items-center justify-center gap-2 px-3 py-3 text-sm font-medium text-primary"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>
              View tasks
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
              className="flex flex-1 items-center justify-center gap-2 border-l border-border px-3 py-3 text-sm font-medium text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Add note</span>
            </button>
          </AddNoteDialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-14 shrink-0 items-center justify-center border-l border-border text-muted-foreground"
                aria-label="Track actions"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/focus/${track.id}`}>Focus session</Link>
              </DropdownMenuItem>
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

      {/* Desktop layout (>=md) — unchanged */}
      <div className="hidden md:grid md:grid-cols-[88px_minmax(0,1.6fr)_auto_minmax(0,1.4fr)_minmax(0,1.4fr)] md:items-center md:gap-5 md:p-4">
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
            <div className="mt-1.5">
              <Badge variant="primary">{genre}</Badge>
            </div>
          )}
          {meta.length > 0 && (
            <p className="mt-1.5 text-xs font-medium text-foreground/80 tabular-nums">
              {meta.join(" · ")}
            </p>
          )}
          {descriptors.length > 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">
              {descriptors.join(", ")}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {lastWorkedLabel}
          </p>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Progress
          </span>
          <ProgressRing value={progress} size={68} />
        </div>

        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Current Bottleneck
          </div>
          {track.bottleneck ? (
            <>
              <p
                className={cn(
                  "mt-1 text-sm font-semibold leading-snug line-clamp-2",
                  "text-danger",
                )}
              >
                {track.bottleneck.description}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {BOTTLENECK_LABELS[
                  track.bottleneck.category as keyof typeof BOTTLENECK_LABELS
                ] ?? track.bottleneck.category}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              No active bottleneck
            </p>
          )}
        </div>

        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Next Action
            </div>
            {track.primaryAction ? (
              <p className="mt-1 text-sm font-medium leading-snug line-clamp-2">
                {track.primaryAction.description}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                No next action set
              </p>
            )}
            <Button
              asChild
              size="sm"
              variant={recommended ? "default" : "outline"}
              className="mt-2"
            >
              <Link href={`/focus/${track.id}`}>Continue</Link>
            </Button>
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
