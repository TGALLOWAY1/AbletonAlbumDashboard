import Link from "next/link";
import { format } from "date-fns";
import {
  CheckCircle2,
  Clock,
  ListMusic,
  Plus,
  Sun,
  TrendingUp,
} from "lucide-react";
import { TrackCard } from "@/components/track-card";
import { NextUpCard } from "@/components/next-up-card";
import { UpcomingAlbumsGallery } from "@/components/album/upcoming-albums-gallery";
import { LibraryStatCard } from "@/components/library/library-stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getTracksByAlbum,
  getTracksByStatus,
  getTracksWithoutAlbum,
} from "@/lib/data/tracks";
import { getActiveAlbum, listUpcomingAlbums } from "@/lib/data/album";
import {
  getSessionCountsByTrackSince,
  getSessionStatsByTrack,
} from "@/lib/data/sessions";
import { recommendTrack } from "@/lib/recommend";
import { formatDuration } from "@/lib/utils";
import {
  progressFromStages,
  STALE_AFTER_DAYS,
  type TrackWithDetails,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function daysSinceWorked(track: TrackWithDetails): number {
  if (!track.last_worked_at) return Infinity;
  return (Date.now() - new Date(track.last_worked_at).getTime()) / 86_400_000;
}

// Opinionated triage order instead of a sort control: tracks being worked
// ("in motion", closest to done first) vs. tracks going stale ("needs
// attention", stalest first).
function triageTracks(tracks: TrackWithDetails[]) {
  const inMotion = tracks
    .filter((t) => daysSinceWorked(t) <= STALE_AFTER_DAYS)
    .sort((a, b) => progressFromStages(b.stages) - progressFromStages(a.stages));
  const needsAttention = tracks
    .filter((t) => daysSinceWorked(t) > STALE_AFTER_DAYS)
    .sort((a, b) => daysSinceWorked(b) - daysSinceWorked(a));
  return { inMotion, needsAttention };
}

export default async function DashboardPage() {
  const [activeAlbum, upcomingAlbums, sessionStats, recentCounts] =
    await Promise.all([
      getActiveAlbum(),
      listUpcomingAlbums(4),
      getSessionStatsByTrack(),
      getSessionCountsByTrackSince(7),
    ]);

  // Active tracks live in the active album. If no album is set up yet (fresh
  // install, or every album deleted), fall back to all status=active tracks so
  // the dashboard never goes empty before the user creates their first album.
  const activeTracks: TrackWithDetails[] = activeAlbum
    ? (await getTracksByAlbum(activeAlbum.id)).filter(
        (t) => t.status === "active",
      )
    : await getTracksByStatus("active");

  // Tracks without an album: surface them so they don't get lost.
  const orphanTracks = activeAlbum ? await getTracksWithoutAlbum() : [];

  // One recommended track up top; everything else triaged below it.
  const recommendation = recommendTrack(activeTracks, recentCounts);
  const rest = activeTracks.filter((t) => t.id !== recommendation?.track.id);
  const { inMotion, needsAttention } = triageTracks(rest);

  // Summary metrics across the active tracks.
  const totalSeconds = activeTracks.reduce(
    (acc, t) => acc + (sessionStats.get(t.id)?.seconds ?? 0),
    0,
  );
  const tasksCompleted = activeTracks.reduce(
    (acc, t) => acc + t.completedTaskCount,
    0,
  );
  const nearCompletion = activeTracks.filter(
    (t) => progressFromStages(t.stages) > 60,
  ).length;

  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const dateLabel = format(now, "MMMM d, yyyy");

  const albumTitle = activeAlbum?.title?.trim() || null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {activeAlbum?.cover_image_url && (
            <Link
              href={`/albums/${activeAlbum.id}`}
              className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2"
              aria-label="Edit active album"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeAlbum.cover_image_url}
                alt={albumTitle ?? "Album cover"}
                className="h-full w-full object-cover"
              />
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {greeting}, producer.
            </h1>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">
              {albumTitle
                ? `Working on “${albumTitle}”.`
                : "Focus on finishing, not starting."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground md:inline-flex">
            <Sun className="h-3.5 w-3.5 text-warning" />
            {dateLabel}
          </span>
          <Button asChild size="sm">
            <Link href="/tracks/new">
              <Plus className="h-4 w-4" />
              Add Track
            </Link>
          </Button>
        </div>
      </header>

      <NextUpCard rec={recommendation} />

      {activeTracks.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <LibraryStatCard
            label="Active Tracks"
            value={activeTracks.length}
            icon={ListMusic}
          />
          <LibraryStatCard
            label="Total Time Worked"
            value={formatDuration(totalSeconds)}
            icon={Clock}
          />
          <LibraryStatCard
            label="Tasks Completed"
            value={tasksCompleted}
            icon={CheckCircle2}
          />
          <LibraryStatCard
            label="Near Completion"
            value={nearCompletion}
            icon={TrendingUp}
            hint="Tracks over 60% done"
          />
        </div>
      )}

      {activeTracks.length === 0 ? (
        <section>
          <Card>
            <CardContent className="flex flex-col items-start gap-3 p-8">
              <h3 className="text-lg font-semibold">
                Your five slots are empty
              </h3>
              <p className="text-sm text-muted-foreground">
                Add up to five tracks to focus on. Anything else lives in the
                backlog until you&apos;re ready.
              </p>
              <Button asChild>
                <Link href="/tracks/new">
                  <Plus className="h-4 w-4" />
                  Add your first track
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      ) : (
        <>
          {inMotion.length > 0 && (
            <section>
              <div className="mb-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  In motion · {inMotion.length}{" "}
                  {inMotion.length === 1 ? "track" : "tracks"}
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {inMotion.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    sessionStats={sessionStats.get(track.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {needsAttention.length > 0 && (
            <section>
              <div className="mb-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-warning">
                  Needs attention · {needsAttention.length}{" "}
                  {needsAttention.length === 1 ? "track" : "tracks"}
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {needsAttention.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    sessionStats={sessionStats.get(track.id)}
                    stale
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <UpcomingAlbumsGallery albums={upcomingAlbums} />

      {orphanTracks.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Unassigned tracks · {orphanTracks.length}
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/albums">Assign to album</Link>
            </Button>
          </div>
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              {orphanTracks.length}{" "}
              {orphanTracks.length === 1 ? "track is" : "tracks are"} not yet
              assigned to an album. Open a track to set its album, or use the
              albums page to bulk-assign.
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
