import Link from "next/link";
import { Disc3 } from "lucide-react";
import { CoverArt } from "@/components/cover-art";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { formatMinutesPlain } from "@/lib/utils";
import {
  isTrackStale,
  progressFromStages,
  type AlbumRow,
  type TrackWithDetails,
} from "@/lib/types";

// Album-level status for the dashboard: where the record as a whole stands
// (average progress, momentum split, queued work).
// Per-track next actions live on the track cards below it — the dashboard
// deliberately has no single "work on this song next" recommendation.
export function ActiveAlbumCard({
  album,
  tracks,
  nowMs,
}: {
  album: AlbumRow;
  tracks: TrackWithDetails[];
  nowMs: number;
}) {
  if (tracks.length === 0) return null;

  const avgProgress =
    tracks.reduce((sum, t) => sum + progressFromStages(t.stages), 0) /
    tracks.length;
  const staleCount = tracks.filter((t) => isTrackStale(t, nowMs)).length;
  const inMotionCount = tracks.length - staleCount;
  const openTasks = tracks.reduce((sum, t) => sum + t.openTaskCount, 0);
  const estMinutes = tracks.reduce((sum, t) => sum + t.estMinutesRemaining, 0);

  const title = album.title?.trim() || "Untitled album";

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
      <CardContent className="flex flex-col gap-4 p-5 md:p-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Disc3 className="h-3.5 w-3.5 text-primary" />
          Active album
        </div>

        <div className="flex items-start gap-4">
          {album.cover_image_url && (
            <Link
              href={`/albums/${album.id}`}
              className="relative hidden h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2 sm:block"
              aria-label={`Open ${title}`}
            >
              <CoverArt src={album.cover_image_url} sizes="64px" />
            </Link>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/albums/${album.id}`}
                className="truncate text-lg font-semibold hover:underline"
              >
                {title}
              </Link>
              {album.genre && <Badge variant="default">{album.genre}</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {tracks.length} active {tracks.length === 1 ? "track" : "tracks"}{" "}
              · {inMotionCount} in motion · {staleCount}{" "}
              {staleCount === 1 ? "needs" : "need"} attention
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground tabular-nums">
                  {openTasks}
                </span>{" "}
                open {openTasks === 1 ? "task" : "tasks"}
              </span>
              {estMinutes > 0 && (
                <span>
                  <span className="font-semibold text-foreground tabular-nums">
                    ~{formatMinutesPlain(estMinutes)}
                  </span>{" "}
                  queued
                </span>
              )}
            </div>
          </div>

          <ProgressRing value={avgProgress} className="shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
