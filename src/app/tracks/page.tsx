import Link from "next/link";
import { Plus } from "lucide-react";
import { TrackCard } from "@/components/track-card";
import { TrackFilterPanel } from "@/components/track-filter-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllTracks } from "@/lib/data/tracks";
import {
  collectFilterOptions,
  filterTracks,
  parseTrackFilters,
  STATUS_LABELS,
  type TrackFilterSearchParams,
} from "@/lib/track-filters";
import { TRACK_STATUSES, type TrackWithDetails } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AllTracksPage({
  searchParams,
}: {
  searchParams: Promise<TrackFilterSearchParams>;
}) {
  const params = await searchParams;
  const tracks = await getAllTracks();

  const filters = parseTrackFilters(params);
  const options = collectFilterOptions(tracks);
  const filtered = filterTracks(tracks, filters);

  const grouped = new Map<string, TrackWithDetails[]>();
  filtered.forEach((t) => {
    const list = grouped.get(t.status) ?? [];
    list.push(t);
    grouped.set(t.status, list);
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tracks</h1>
          <p className="mt-1 text-muted-foreground">
            Library view — beyond the active five.
          </p>
        </div>
        <Button asChild>
          <Link href="/tracks/new">
            <Plus className="h-4 w-4" />
            Add Track
          </Link>
        </Button>
      </header>

      <TrackFilterPanel
        filters={filters}
        options={options}
        resultCount={filtered.length}
      />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">
            No tracks match these filters.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {TRACK_STATUSES.filter((s) => grouped.has(s)).map((s) => (
            <section key={s}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {STATUS_LABELS[s]}
                <Badge variant="default">{grouped.get(s)?.length ?? 0}</Badge>
              </h2>
              <div className="flex flex-col gap-3">
                {grouped.get(s)?.map((t) => (
                  <TrackCard key={t.id} track={t} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
