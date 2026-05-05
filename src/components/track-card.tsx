import Link from "next/link";
import { format } from "date-fns";
import { MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressRing, toneForProgress } from "@/components/ui/progress-ring";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TrackCardActions } from "@/components/track-card-actions";
import { DeleteTrackMenuItem } from "@/components/delete-track-menu-item";
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
  const tone = toneForProgress(progress);
  const [genre, ...descriptors] = track.tags;
  const lastWorkedLabel = track.last_worked_at
    ? `Last worked: ${format(new Date(track.last_worked_at), "MMM d, yyyy")}`
    : "Never worked on yet";

  return (
    <Card
      className={cn(
        "grid grid-cols-[88px_minmax(0,1.6fr)_auto_minmax(0,1.4fr)_minmax(0,1.4fr)] items-center gap-5 p-4",
        recommended && "ring-1 ring-primary/40",
      )}
    >
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
        <ProgressRing value={progress} size={68} tone={tone} />
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
    </Card>
  );
}
