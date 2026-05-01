import Link from "next/link";
import { format } from "date-fns";
import { Plus, Sun } from "lucide-react";
import { TrackCard } from "@/components/track-card";
import { RecommendationCard } from "@/components/recommendation-card";
import {
  TrackSortControl,
  SORT_OPTIONS,
  type SortValue,
} from "@/components/track-sort-control";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTracksByStatus } from "@/lib/data/tracks";
import { recommendTrack } from "@/lib/recommend";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { progressFromStages, type TrackWithDetails } from "@/lib/types";

export const dynamic = "force-dynamic";

async function fetchSessionsLast7DaysByTrack() {
  const supabase = getServerSupabase();
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { data } = await supabase
    .from("sessions")
    .select("track_id, tracks!inner(owner_id)")
    .eq("tracks.owner_id", OWNER_ID)
    .gte("started_at", since.toISOString());
  const map = new Map<string, number>();
  (data ?? []).forEach((row) => {
    map.set(row.track_id, (map.get(row.track_id) ?? 0) + 1);
  });
  return map;
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function isSortValue(v: string | undefined): v is SortValue {
  return SORT_OPTIONS.some((o) => o.value === v);
}

function sortTracks(
  tracks: TrackWithDetails[],
  sort: SortValue,
  scoreById: Map<string, number>,
): TrackWithDetails[] {
  const list = [...tracks];
  switch (sort) {
    case "recent":
      list.sort((a, b) => {
        const ax = a.last_worked_at ? new Date(a.last_worked_at).getTime() : 0;
        const bx = b.last_worked_at ? new Date(b.last_worked_at).getTime() : 0;
        return bx - ax;
      });
      break;
    case "progress":
      list.sort(
        (a, b) => progressFromStages(b.stages) - progressFromStages(a.stages),
      );
      break;
    case "name":
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "recommended":
    default:
      list.sort(
        (a, b) => (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0),
      );
  }
  return list;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ sort?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const sort: SortValue = isSortValue(sp.sort) ? sp.sort : "recommended";

  const [active, sessionCounts] = await Promise.all([
    getTracksByStatus("active"),
    fetchSessionsLast7DaysByTrack(),
  ]);
  const recommendation = recommendTrack(active, sessionCounts);

  // Build score map for sort=recommended.
  const scoreById = new Map<string, number>();
  active.forEach((t) => {
    const r = recommendTrack([t], sessionCounts);
    scoreById.set(t.id, r?.score ?? 0);
  });
  const sorted = sortTracks(active, sort, scoreById);

  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const dateLabel = format(now, "MMMM d, yyyy");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {greeting}, producer.
          </h1>
          <p className="mt-1 text-muted-foreground">
            Focus on finishing, not starting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">
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

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Your {active.length} {active.length === 1 ? "track" : "tracks"}
          </h2>
          <TrackSortControl current={sort} />
        </div>

        {sorted.length === 0 ? (
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
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                recommended={recommendation?.track.id === track.id}
              />
            ))}
          </div>
        )}
      </section>

      <RecommendationCard rec={recommendation} />
    </div>
  );
}
